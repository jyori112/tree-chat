import { Annotation } from "@langchain/langgraph";

// Researcher Agent State
export const ResearcherState = Annotation.Root({
  // Input
  subTask: Annotation<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>(),
  
  originalIssue: Annotation<{
    title: string;
    description: string;
    background?: string;
    objectives: string[];
    scope: string;
    constraints?: string;
    priority: 'high' | 'medium' | 'low';
    tags?: string[];
  }>(),
  
  // Output
  subTaskId: Annotation<string>(),
  result: Annotation<{
    conclusion: string;
    evidence: string[];
    sources: Array<{
      type: 'web' | 'document' | 'database' | 'interview' | 'survey';
      title: string;
      url?: string;
      author?: string;
      publishDate?: string;
      relevance: number; // 0-1
      credibility: number; // 0-1
      excerpt: string;
    }>;
    additionalTasks?: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    confidence: number; // 0-1
    completedAt: string;
  }>(),
  executionLog: Annotation<string>(),
  
  // Internal
  messages: Annotation<Array<any>>({
    reducer: (x, y) => x.concat(y),
  }),
  searchResults: Annotation<Array<any>>({
    reducer: (x, y) => x.concat(y),
  }),
});

export type ResearcherStateType = typeof ResearcherState.State;