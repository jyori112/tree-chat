import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { 
  TaskSuggestionState, 
  TaskSuggestionStateType,
  TaskSuggestionSchema,
  Task
} from "./state.js";
import { 
  ConfigurationSchema,
  ConfigurationType,
  ensureConfiguration 
} from "./configuration.js";
import { 
  TASK_SUGGESTION_PROMPT,
  ANALYZE_SESSION_PROMPT,
  FORMAT_SUGGESTIONS_PROMPT
} from "./prompts.js";
import { z } from "zod";

// Helper function to get LLM instance
function getLLM(config: ConfigurationType) {
  const modelName = config.model;
  
  // Always use ChatOpenAI
  if (modelName.startsWith("anthropic/")) {
    return new ChatOpenAI({
      model: modelName.replace("anthropic/", ""),
      temperature: config.temperature,
    });
  } else if (modelName.startsWith("openai/")) {
    return new ChatOpenAI({
      model: modelName.replace("openai/", ""),
      temperature: config.temperature,
    });
  } else {
    // Default to OpenAI
    return new ChatOpenAI({
      model: modelName,
      temperature: config.temperature,
    });
  }
}

// Node: Analyze session context
async function analyzeSessionContext(
  state: TaskSuggestionStateType
): Promise<Partial<TaskSuggestionStateType>> {
  const configuration = ensureConfiguration();
  const llm = getLLM(configuration);
  
  try {
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
    
    const prompt = `${ANALYZE_SESSION_PROMPT}

Session Information:
${JSON.stringify(sessionInfo, null, 2)}

Pages Content:
${pagesContext}

Current Tasks Structure:
${tasksContext}

Request Type: ${state.requestType}

Please analyze this session and provide a comprehensive context summary.`;
    
    const response = await llm.invoke(prompt);
    
    return {
      sessionContext: response.content as string,
      reasoning: `Analyzed ${state.pages.length} pages and ${state.tasks.length} tasks in session`,
    };
  } catch (error) {
    return {
      error: `Failed to analyze session context: ${error}`,
    };
  }
}

// Node: Generate task suggestions
async function generateSuggestions(
  state: TaskSuggestionStateType
): Promise<Partial<TaskSuggestionStateType>> {
  const configuration = ensureConfiguration();
  const llm = getLLM(configuration);
  
  try {
    // Create structured output schema
    const SuggestionsOutputSchema = z.object({
      suggestions: z.array(TaskSuggestionSchema).max(configuration.maxSuggestions),
      summary: z.string(),
    });
    
    // Always use ChatOpenAI
    const structuredLLM = (llm as ChatOpenAI).withStructuredOutput(SuggestionsOutputSchema);
    
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
    
    const prompt = `${TASK_SUGGESTION_PROMPT}

Session Context:
${state.sessionContext}

${focusedPrompt}

${FORMAT_SUGGESTIONS_PROMPT}

Generate ${configuration.maxSuggestions} task suggestions in the structured format.`;
    
    const response = await structuredLLM.invoke(prompt);
    
    return {
      suggestions: response.suggestions,
      summary: response.summary,
    };
  } catch (error) {
    return {
      error: `Failed to generate suggestions: ${error}`,
      suggestions: [],
      summary: "Unable to generate suggestions due to an error.",
    };
  }
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

// Build the workflow
const workflow = new StateGraph(TaskSuggestionState, ConfigurationSchema)
  .addNode("analyze_context", analyzeSessionContext as any)
  .addNode("generate_suggestions", generateSuggestions as any)
  .addEdge("__start__", "analyze_context")
  .addEdge("analyze_context", "generate_suggestions")
  .addEdge("generate_suggestions", "__end__");

export const graph = workflow.compile();