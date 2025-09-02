import { Annotation } from "@langchain/langgraph";

// Lean Canvas Suggestion types
export interface LeanCanvasSuggestion {
  sectionId: string;
  currentValue: string;
  suggestion: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  type: 'empty' | 'insufficient' | 'improvement';
}

// Input state from frontend
export interface LeanCanvasRequest {
  businessName: string;
  canvasData: Record<string, string>;
  context?: {
    timestamp?: string;
    requestType?: 'suggestion' | 'validation' | 'improvement';
  };
}

// LangGraph output
export interface LeanCanvasOutput {
  success: boolean;
  suggestions: LeanCanvasSuggestion[];
  metadata?: {
    reasoning?: string;
    processingTime?: number;
    model?: string;
  };
  errors?: string[];
}

// Combined state that can accept the input directly
export type CombinedLeanCanvasState = LeanCanvasRequest & {
  // LLM reasoning and processing
  reasoning?: string;
  
  // Generated suggestions
  suggestions?: LeanCanvasSuggestion[];
  
  // Final output
  output?: LeanCanvasOutput | null;
  
  // Error handling
  error?: string | null;
};

// State annotation for LangGraph
export const LeanCanvasAgentState = Annotation.Root({
  // Core input fields
  businessName: Annotation<string>,
  
  canvasData: Annotation<Record<string, string>>,
  
  context: Annotation<{
    timestamp?: string;
    requestType?: 'suggestion' | 'validation' | 'improvement';
  } | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // LLM reasoning and processing
  reasoning: Annotation<string>({
    value: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  
  // Generated suggestions
  suggestions: Annotation<LeanCanvasSuggestion[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  // Final output
  output: Annotation<LeanCanvasOutput | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

export type LeanCanvasAgentStateType = typeof LeanCanvasAgentState.State;