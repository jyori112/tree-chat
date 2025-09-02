import { Annotation } from "@langchain/langgraph";

// Interview Tree Command types
export interface InterviewTreeCommand {
  type: "ADD_CHILD_QUESTION" | "UPDATE_QUESTION" | "DELETE_QUESTION";
  payload: any;
}

// Input state from frontend
export interface InterviewTreeState {
  rootQuestion: any; // Full tree structure
  currentQuestionId?: string;
  completedQuestionIds: string[];
  totalQuestions: number;
  answeredCount: number;
  isComplete: boolean;
  lastModified: string;
  version: number;
}

// LangGraph input
export interface InterviewInput {
  command: {
    type: string;
    payload: any;
  };
  currentState: InterviewTreeState;
  context?: {
    userId?: string;
    sessionId?: string;
    timestamp: string;
  };
}

// LangGraph output
export interface InterviewOutput {
  success: boolean;
  commands: InterviewTreeCommand[];
  metadata?: {
    reasoning?: string;
    processingTime?: number;
    model?: string;
  };
  errors?: string[];
}

// Combined state that can accept either the input directly or as a structured state
export type CombinedState = InterviewInput & {
  // LLM reasoning and processing
  reasoning?: string;
  
  // Generated commands
  commands?: InterviewTreeCommand[];
  
  // Final output
  output?: InterviewOutput | null;
  
  // Error handling
  error?: string | null;
};

// State annotation for LangGraph - accepts InterviewInput as base and extends it
export const InterviewAgentState = Annotation.Root({
  // Core input fields - these will be present when LangGraph passes initial input
  command: Annotation<{
    type: string;
    payload: any;
  }>,
  
  currentState: Annotation<InterviewTreeState>,
  
  context: Annotation<{
    userId?: string;
    sessionId?: string;
    timestamp?: string;
  } | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // LLM reasoning and processing
  reasoning: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  // Generated commands
  commands: Annotation<InterviewTreeCommand[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  // Final output
  output: Annotation<InterviewOutput | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

export type InterviewAgentStateType = typeof InterviewAgentState.State;