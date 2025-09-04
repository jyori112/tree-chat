import { Annotation } from "@langchain/langgraph";

export interface BrainstormIdea {
  id: string;
  title: string;
  description: string;
  category: 'product' | 'service' | 'platform' | 'other';
  targetMarket: string;
  uniqueValue: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ideas?: BrainstormIdea[];
}

export interface BrainstormRequest {
  message: string;
  chatHistory: ChatMessage[];
  selectedIdea?: BrainstormIdea;
  userInterests: string;
}

export interface BrainstormOutput {
  success: boolean;
  response: string;
  ideas?: BrainstormIdea[];
  errors?: string[];
}

// State annotation for LangGraph
export const BrainstormAgentState = Annotation.Root({
  // Core input fields
  message: Annotation<string>,
  
  chatHistory: Annotation<ChatMessage[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  selectedIdea: Annotation<BrainstormIdea | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  userInterests: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  // Processing fields
  shouldGenerateIdeas: Annotation<boolean>({
    value: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
  
  // Final output
  response: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  ideas: Annotation<BrainstormIdea[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  output: Annotation<BrainstormOutput | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

export type BrainstormAgentStateType = typeof BrainstormAgentState.State;