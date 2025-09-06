import { Annotation } from "@langchain/langgraph";

// Reporter Agent State
export const ReporterState = Annotation.Root({
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
    result: {
      conclusion: string;
      evidence: string[];
      sources: Array<{
        type: 'web' | 'document' | 'database' | 'interview' | 'survey';
        title: string;
        url?: string;
        author?: string;
        publishDate?: string;
        relevance: number;
        credibility: number;
        excerpt: string;
      }>;
      confidence: number;
      completedAt: string;
    };
  }>>(),
  
  executionMetadata: Annotation<{
    totalExecutionTime: number;
    startedAt: string;
    completedAt: string;
  }>(),
  
  // Output
  report: Annotation<{
    title: string;
    executiveSummary: string;
    methodology: string;
    keyFindings: Array<{
      id: string;
      title: string;
      description: string;
      evidence: string[];
      sources: Array<any>;
      confidence: number;
      significance: 'high' | 'medium' | 'low';
    }>;
    conclusions: string[];
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      rationale: string;
      priority: 'high' | 'medium' | 'low';
      timeline: string;
      resources?: string[];
      risks?: string[];
    }>;
    limitations: string[];
    nextSteps?: string[];
    appendices?: Array<{
      id: string;
      title: string;
      content: string;
      type: 'data' | 'methodology' | 'sources' | 'other';
    }>;
    generatedAt: string;
  }>(),
  
  summary: Annotation<{
    totalSubTasks: number;
    successfulTasks: number;
    keyInsights: string[];
    confidenceLevel: number;
  }>(),
  
  // Internal
  messages: Annotation<Array<any>>({
    reducer: (x, y) => x.concat(y),
  }),
});

export type ReporterStateType = typeof ReporterState.State;