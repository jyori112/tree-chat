import { Annotation } from "@langchain/langgraph";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BusinessChatRequest {
  businessName: string;
  canvasData: Record<string, string>;
  message: string;
  chatHistory: ChatMessage[];
}

export interface CanvasSuggestion {
  sectionId: string;
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
}

export interface BusinessChatOutput {
  success: boolean;
  response: string;
  canvasSuggestions?: CanvasSuggestion[];
  metadata?: {
    reasoning?: string;
    searchQueries?: string[];
    model?: string;
  };
  errors?: string[];
}

// State annotation for LangGraph
export const BusinessChatAgentState = Annotation.Root({
  // Core input fields
  businessName: Annotation<string>,
  
  canvasData: Annotation<Record<string, string>>,
  
  message: Annotation<string>,
  
  chatHistory: Annotation<ChatMessage[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  // Processing fields
  reasoning: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  searchQueries: Annotation<string[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  searchResults: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  // Final output
  response: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  output: Annotation<BusinessChatOutput | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

export type BusinessChatAgentStateType = typeof BusinessChatAgentState.State;