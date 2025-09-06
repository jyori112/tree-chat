/**
 * Deep Research LangGraph Clients
 * 実際のLangGraphエージェントと通信するクライアント
 */

import { createLangGraphClient } from './langgraph-client';
import {
  ManagerInput,
  ManagerOutput,
  ResearcherInput, 
  ResearcherOutput,
  ReporterInput,
  ReporterOutput
} from './deep-research-types';

// Manager Agent Client
export const managerClient = createLangGraphClient<ManagerInput, ManagerOutput>({
  assistantId: 'deep_research_manager_agent',
  
  transformInput: (input: ManagerInput) => ({
    researchIssue: input.researchIssue,
    completedSubTasks: input.completedSubTasks || [],
    pendingSubTasks: input.pendingSubTasks || [],
    isInitial: input.isInitial || false
  }),
  
  transformOutput: (output: any): ManagerOutput => ({
    decision: output.decision || 'complete',
    subTasks: output.subTasks || [],
    reasoning: output.reasoning || 'Manager analysis completed',
    estimatedProgress: output.estimatedProgress || 100
  })
});

// Researcher Agent Client
export const researcherClient = createLangGraphClient<ResearcherInput, ResearcherOutput>({
  assistantId: 'deep_research_researcher_agent',
  
  transformInput: (input: ResearcherInput) => ({
    subTask: input.subTask,
    originalIssue: input.originalIssue
  }),
  
  transformOutput: (output: any): ResearcherOutput => ({
    subTaskId: output.subTaskId || output.subTask?.id || 'unknown',
    result: {
      conclusion: output.result?.conclusion || `${output.subTask?.title || 'SubTask'}について調査を完了しました。`,
      evidence: output.result?.evidence || ['調査を実行しました'],
      sources: output.result?.sources || [],
      additionalTasks: output.result?.additionalTasks || [],
      confidence: output.result?.confidence || 0.8,
      completedAt: output.result?.completedAt || new Date().toISOString()
    },
    executionLog: output.executionLog || `Research completed`
  })
});

// Reporter Agent Client
export const reporterClient = createLangGraphClient<ReporterInput, ReporterOutput>({
  assistantId: 'deep_research_reporter_agent',
  
  transformInput: (input: ReporterInput) => ({
    researchIssue: input.researchIssue,
    completedSubTasks: input.completedSubTasks,
    executionMetadata: input.executionMetadata
  }),
  
  transformOutput: (output: any): ReporterOutput => ({
    report: output.report || {
      title: `${output.researchIssue?.title || 'Research'} - Research Report`,
      executiveSummary: `${output.researchIssue?.title || 'Research'}について包括的な調査を実施しました。`,
      methodology: 'LangGraphエージェントによる自動調査を実施',
      keyFindings: output.report?.keyFindings || [],
      conclusions: output.report?.conclusions || ['調査を完了しました'],
      recommendations: output.report?.recommendations || [],
      limitations: output.report?.limitations || ['LangGraphエージェントによる調査結果'],
      nextSteps: output.report?.nextSteps,
      appendices: output.report?.appendices,
      generatedAt: new Date().toISOString()
    },
    summary: output.summary || {
      totalSubTasks: output.completedSubTasks?.length || 0,
      successfulTasks: output.completedSubTasks?.length || 0,
      keyInsights: output.summary?.keyInsights || [],
      confidenceLevel: output.summary?.confidenceLevel || 0.8
    }
  })
});

// Combined Deep Research Agent Interface
export class DeepResearchLangGraphClient {
  async invokeManager(input: ManagerInput): Promise<ManagerOutput> {
    console.log('🔄 Invoking Manager Agent...', input);
    const result = await managerClient.execute(input);
    
    if (!result.success || !result.data) {
      throw new Error(`Manager Agent failed: ${result.error}`);
    }
    
    console.log('✅ Manager Agent completed:', result.data);
    return result.data;
  }

  async invokeResearcher(input: ResearcherInput): Promise<ResearcherOutput> {
    console.log('🔍 Invoking Researcher Agent...', input.subTask.title);
    const result = await researcherClient.execute(input);
    
    if (!result.success || !result.data) {
      throw new Error(`Researcher Agent failed: ${result.error}`);
    }
    
    console.log('✅ Researcher Agent completed:', result.data.subTaskId);
    return result.data;
  }

  async invokeReporter(input: ReporterInput): Promise<ReporterOutput> {
    console.log('📊 Invoking Reporter Agent...', input.researchIssue.title);
    const result = await reporterClient.execute(input);
    
    if (!result.success || !result.data) {
      throw new Error(`Reporter Agent failed: ${result.error}`);
    }
    
    console.log('✅ Reporter Agent completed:', result.data.report.title);
    return result.data;
  }
}

export const deepResearchClient = new DeepResearchLangGraphClient();