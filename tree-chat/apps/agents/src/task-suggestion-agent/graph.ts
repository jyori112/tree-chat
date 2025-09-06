import { createCanvasAgent } from "../shared/canvas-agent-base.js";
import {
  TaskSuggestionState,
  TaskSuggestionStateType,
  TaskSuggestionSchema,
  Task
} from "./state.js";
import {
  TASK_SUGGESTION_PROMPT,
  ANALYZE_SESSION_PROMPT,
  FORMAT_SUGGESTIONS_PROMPT
} from "./prompts.js";
import { z } from "zod";

// Structured output schema for task suggestions
const TaskSuggestionOutputSchema = z.object({
  suggestions: z.array(TaskSuggestionSchema),
  summary: z.string(),
});

// Format input for the canvas agent
function formatInput(state: TaskSuggestionStateType): string {
  // Build comprehensive session context
  const sessionInfo = {
    sessionId: state.sessionId,
    currentPageId: state.currentPageId,
    totalPages: state.pages.length,
    totalTasks: state.tasks.length,
    tasksByStatus: {
      todo: state.tasks.filter(t => t.status === 'todo').length,
      pending: state.tasks.filter(t => t.status === 'pending').length,
      in_progress: state.tasks.filter(t => t.status === 'in_progress').length,
      completed: state.tasks.filter(t => t.status === 'completed').length,
    },
    pageTypes: [...new Set(state.pages.map(p => p.type))],
  };

  // Format pages with their content
  const pagesContext = state.pages.map(page => {
    const fields = Object.entries(page.fields || {})
      .filter(([, value]) => value && value !== '')
      .map(([fieldKey, value]) => `  - ${fieldKey}: ${JSON.stringify(value).slice(0, 200)}`)
      .join('\n');

    return `Page: ${page.name} (Type: ${page.type}, ID: ${page.id})
${fields || '  No content yet'}`;
  }).join('\n\n');

  // Format task tree structure
  const taskTree = buildTaskTree(state.tasks);
  const tasksContext = formatTaskTree(taskTree);

  // Build focused context based on request type
  let focusedPrompt = "";
  switch (state.requestType) {
    case 'next_tasks':
      focusedPrompt = "Focus on identifying the next logical tasks to add based on current progress.";
      break;
    case 'results_to_record':
      focusedPrompt = "Focus on identifying tasks where results can be recorded based on information in other pages.";
      break;
    case 'status_updates':
      focusedPrompt = "Focus on suggesting appropriate status changes based on task progress and dependencies.";
      break;
    default:
      focusedPrompt = "Provide a balanced mix of suggestions across all categories.";
  }

  return `${ANALYZE_SESSION_PROMPT}

Session Information:
${JSON.stringify(sessionInfo, null, 2)}

Pages Content:
${pagesContext}

Current Tasks Structure:
${tasksContext}

Request Type: ${state.requestType}

${TASK_SUGGESTION_PROMPT}

${focusedPrompt}

${FORMAT_SUGGESTIONS_PROMPT}

Generate task suggestions in the structured format.`;
}

// Parse output from LLM
function parseOutput(response: any, state: TaskSuggestionStateType) {
  return {
    ...state,
    suggestions: response.suggestions || [],
    summary: response.summary || "Task suggestions generated",
    output: {
      success: true,
      suggestions: response.suggestions || [],
      summary: response.summary || "Task suggestions generated"
    }
  };
}

// Helper: Build task tree from flat list
function buildTaskTree(tasks: Task[]): TaskTree[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const rootTasks: TaskTree[] = [];

  tasks.forEach(task => {
    if (!task.parentId) {
      rootTasks.push(buildTaskNode(task, taskMap));
    }
  });

  return rootTasks.sort((a, b) => a.task.order - b.task.order);
}

interface TaskTree {
  task: Task;
  children: TaskTree[];
}

function buildTaskNode(task: Task, taskMap: Map<string, Task>): TaskTree {
  const children = task.childIds
    .map(id => taskMap.get(id))
    .filter((t): t is Task => t !== undefined)
    .map(child => buildTaskNode(child, taskMap))
    .sort((a, b) => a.task.order - b.task.order);

  return { task, children };
}

// Helper: Format task tree as text
function formatTaskTree(trees: TaskTree[], indent = 0): string {
  return trees.map(tree => {
    const prefix = '  '.repeat(indent);
    const status = tree.task.status.toUpperCase();
    const result = tree.task.result ? ' ✓' : '';
    const taskLine = `${prefix}- [${status}${result}] ${tree.task.name}: ${tree.task.description}`;

    if (tree.children.length > 0) {
      const childrenLines = formatTaskTree(tree.children, indent + 1);
      return `${taskLine}\n${childrenLines}`;
    }

    return taskLine;
  }).join('\n');
}

// Create the task suggestion agent using createCanvasAgent
export const graph = createCanvasAgent(TaskSuggestionState, {
  agentName: 'TaskSuggestionAgent',
  model: 'gpt-4o',
  temperature: 0.7,
  formatInput,
  parseOutput,
  structuredOutputSchema: TaskSuggestionOutputSchema,
});