import { Annotation } from "@langchain/langgraph";
import { z } from "zod";

// Task structure from frontend
export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  result: z.string(),
  status: z.enum(['todo', 'pending', 'in_progress', 'completed']),
  parentId: z.string().optional(),
  childIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  order: z.number()
});

// Page structure from frontend
export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  fields: z.record(z.any()),
  createdAt: z.string()
});

// Suggestion types
export const TaskSuggestionSchema = z.object({
  type: z.enum(['new_task', 'update_result', 'change_status', 'add_subtask']),
  taskId: z.string().optional(), // For updates
  parentId: z.string().optional(), // For subtasks
  name: z.string().optional(),
  description: z.string().optional(),
  result: z.string().optional(),
  status: z.enum(['todo', 'pending', 'in_progress', 'completed']).optional(),
  reason: z.string(), // Why this suggestion is being made
  priority: z.enum(['high', 'medium', 'low']),
  relatedPageIds: z.array(z.string()) // Which pages this suggestion is based on
});

export type Task = z.infer<typeof TaskSchema>;
export type Page = z.infer<typeof PageSchema>;
export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>;

// Input from frontend
export interface TaskSuggestionInput {
  sessionId: string;
  currentPageId: string;
  tasks: Task[];
  pages: Page[];
  requestType?: 'general' | 'next_tasks' | 'results_to_record' | 'status_updates';
}

// Output to frontend
export interface TaskSuggestionOutput {
  suggestions: TaskSuggestion[];
  summary: string;
}

// Agent State using Annotations
export const TaskSuggestionState = Annotation.Root({
  // Input fields
  sessionId: Annotation<string>,
  currentPageId: Annotation<string>,
  tasks: Annotation<Task[]>,
  pages: Annotation<Page[]>,
  requestType: Annotation<string>({
    value: (x, y) => y ?? x ?? 'general',
    default: () => 'general',
  }),
  
  // Processing fields
  sessionContext: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  reasoning: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  // Output fields
  suggestions: Annotation<TaskSuggestion[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  summary: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

export type TaskSuggestionStateType = typeof TaskSuggestionState.State;