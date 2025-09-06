import { Annotation } from "@langchain/langgraph";

// Manager Agent State
export const ManagerState = Annotation.Root({
  // Input
  researchIssue: Annotation<{
    title: string;
    description: string;
    background?: string;
    objectives: string[];
    scope: string;
    constraints?: string;
    priority: 'high' | 'medium' | 'low';
    tags?: string[];
  }>(),
  
  completedSubTasks: Annotation<Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: string;
    result?: {
      conclusion: string;
      evidence: string[];
      sources: Array<any>;
      confidence: number;
    };
  }>>(),
  
  pendingSubTasks: Annotation<Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    status: string;
  }>>(),
  
  isInitial: Annotation<boolean>(),
  
  // Output
  decision: Annotation<'continue' | 'complete'>(),
  subTasks: Annotation<Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    dependencies?: string[];
  }>>(),
  reasoning: Annotation<string>(),
  estimatedProgress: Annotation<number>(),
  
  // Internal
  messages: Annotation<Array<any>>({
    reducer: (x, y) => x.concat(y),
  }),
});

export type ManagerStateType = typeof ManagerState.State;