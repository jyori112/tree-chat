import { Annotation } from "@langchain/langgraph";

export interface Keyword {
  text: string;
  category: 'interest' | 'problem' | 'skill' | 'market';
  size: 'small' | 'medium' | 'large';
}

export interface IdeaCard {
  title: string;
  description: string;
  keywords: string[];
}

export interface Question {
  id: string;
  text: string;
  category: 'interest' | 'problem' | 'skill' | 'market';
}

export interface VisualBrainstormRequest {
  question: string;
  answer: string;
  category: string;
  existingKeywords: Keyword[];
  existingIdeas: IdeaCard[];
}

export interface VisualBrainstormOutput {
  success: boolean;
  keywords?: Keyword[];
  ideas?: IdeaCard[];
  newQuestions?: Question[];
  errors?: string[];
}

// State annotation for LangGraph
export const VisualBrainstormAgentState = Annotation.Root({
  // Core input fields
  question: Annotation<string>,
  answer: Annotation<string>,
  category: Annotation<string>,
  
  existingKeywords: Annotation<Keyword[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  existingIdeas: Annotation<IdeaCard[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  // Processing fields
  keywords: Annotation<Keyword[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  ideas: Annotation<IdeaCard[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  newQuestions: Annotation<Question[]>({
    value: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  
  // Final output
  output: Annotation<VisualBrainstormOutput | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
  
  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => y ?? x ?? null,
    default: () => null,
  }),
});

export type VisualBrainstormAgentStateType = typeof VisualBrainstormAgentState.State;