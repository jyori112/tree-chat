/**
 * Deep Research Orchestrator
 * Manager-Researcher-Reporter の協働システムを管理
 */

import {
  ResearchIssue,
  SubTask,
  SubTaskResult,
  ManagerInput,
  ManagerOutput,
  ResearcherInput,
  ResearcherOutput,
  ReporterInput,
  ReporterOutput,
  DeepResearchState
} from './deep-research-types';
import { DeepResearchStore } from './deep-research-store';

import { deepResearchClient } from './deep-research-langgraph-client';

// LangGraph agents interface
interface ManagerAgent {
  invoke(input: ManagerInput): Promise<ManagerOutput>;
}

interface ResearcherAgent {
  invoke(input: ResearcherInput): Promise<ResearcherOutput>;
}

interface ReporterAgent {
  invoke(input: ReporterInput): Promise<ReporterOutput>;
}

// Real LangGraph Agent implementations
class RealManagerAgent implements ManagerAgent {
  async invoke(input: ManagerInput): Promise<ManagerOutput> {
    return await deepResearchClient.invokeManager(input);
  }
}

class RealResearcherAgent implements ResearcherAgent {
  async invoke(input: ResearcherInput): Promise<ResearcherOutput> {
    return await deepResearchClient.invokeResearcher(input);
  }
}

class RealReporterAgent implements ReporterAgent {
  async invoke(input: ReporterInput): Promise<ReporterOutput> {
    return await deepResearchClient.invokeReporter(input);
  }
}

export class DeepResearchOrchestrator {
  private managerAgent: ManagerAgent;
  private researcherAgent: ResearcherAgent;
  private reporterAgent: ReporterAgent;

  constructor(
    private store: DeepResearchStore,
    private onStateChange?: (state: DeepResearchState) => void
  ) {
    // Initialize with real LangGraph agents
    this.managerAgent = new RealManagerAgent();
    this.researcherAgent = new RealResearcherAgent();
    this.reporterAgent = new RealReporterAgent();
  }

  // Start the complete research process
  async startResearch(issue: ResearchIssue): Promise<void> {
    try {
      // 1. Set the research issue
      await this.store.setIssue(issue);
      await this.notifyStateChange();

      // 2. Initial Manager execution
      const managerInput: ManagerInput = {
        researchIssue: issue,
        isInitial: true
      };

      const managerOutput = await this.managerAgent.invoke(managerInput);
      await this.store.addManagerIteration(managerOutput);
      await this.notifyStateChange();

      // 3. Execute research loop
      await this.executeResearchLoop();

    } catch (error) {
      console.error('Research orchestration error:', error);
      throw error;
    }
  }

  // Execute the research loop until Manager decides to complete
  private async executeResearchLoop(): Promise<void> {
    const state = await this.store.getState();
    if (!state) throw new Error('Invalid state');

    let continueResearch = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (continueResearch && iterations < maxIterations) {
      iterations++;
      
      // Get current subtasks
      const pendingTasks = this.store.getSubTasksByStatus(state, 'created');
      
      if (pendingTasks.length > 0) {
        // Execute pending subtasks in parallel (limited concurrency)
        const concurrency = 3;
        for (let i = 0; i < pendingTasks.length; i += concurrency) {
          const batch = pendingTasks.slice(i, i + concurrency);
          await Promise.all(batch.map(task => this.executeSubTask(task)));
        }
        await this.notifyStateChange();
      }

      // Get updated state after subtask execution
      const updatedState = await this.store.getState();
      if (!updatedState) break;

      const completedTasks = this.store.getCompletedSubTasksWithResults(updatedState);
      const remainingPending = this.store.getSubTasksByStatus(updatedState, 'created');

      // Ask Manager for continuation decision
      const managerInput: ManagerInput = {
        researchIssue: updatedState.issue!,
        completedSubTasks: completedTasks,
        pendingSubTasks: remainingPending,
        isInitial: false
      };

      const managerOutput = await this.managerAgent.invoke(managerInput);
      await this.store.addManagerIteration(managerOutput);
      await this.notifyStateChange();

      if (managerOutput.decision === 'complete') {
        continueResearch = false;
        // Generate final report
        await this.generateFinalReport();
      }
    }

    if (iterations >= maxIterations) {
      console.warn('Research loop reached maximum iterations');
      await this.generateFinalReport();
    }
  }

  // Execute a single subtask
  private async executeSubTask(subTask: SubTask): Promise<void> {
    const state = await this.store.getState();
    if (!state?.issue) return;

    try {
      // Mark subtask as in progress
      await this.store.startSubTask(subTask.id);
      await this.notifyStateChange();

      // Execute research
      const researcherInput: ResearcherInput = {
        subTask,
        originalIssue: state.issue
      };

      const researcherOutput = await this.researcherAgent.invoke(researcherInput);

      // Complete subtask with result
      await this.store.completeSubTask(subTask.id, researcherOutput.result);
      
    } catch (error) {
      console.error(`SubTask ${subTask.id} execution error:`, error);
      // Mark as failed - you might want to add a 'failed' status to SubTaskStatus
      const failedResult: SubTaskResult = {
        conclusion: `エラーにより調査を完了できませんでした: ${error}`,
        evidence: [],
        sources: [],
        confidence: 0,
        completedAt: new Date().toISOString()
      };
      await this.store.completeSubTask(subTask.id, failedResult);
    }
  }

  // Generate final report using Reporter agent
  private async generateFinalReport(): Promise<void> {
    const state = await this.store.getState();
    if (!state?.issue) return;

    try {
      // Update status to reporting
      await this.store.updateState({ overallStatus: 'reporting' });
      await this.notifyStateChange();

      const completedTasks = this.store.getCompletedSubTasksWithResults(state);
      const startTime = state.executionMetadata.startedAt;
      const currentTime = new Date().toISOString();
      const executionTime = startTime ? 
        Math.round((new Date(currentTime).getTime() - new Date(startTime).getTime()) / 1000) : 0;

      const reporterInput: ReporterInput = {
        researchIssue: state.issue,
        completedSubTasks: completedTasks,
        executionMetadata: {
          totalExecutionTime: executionTime,
          startedAt: startTime || currentTime,
          completedAt: currentTime
        }
      };

      const reporterOutput = await this.reporterAgent.invoke(reporterInput);
      
      // Save report and complete research
      await this.store.setReport(reporterOutput.report);
      await this.notifyStateChange();

    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  }

  // Notify state changes
  private async notifyStateChange(): Promise<void> {
    if (this.onStateChange) {
      const state = await this.store.getState();
      if (state) {
        this.onStateChange(state);
      }
    }
  }

  // Get current research progress
  async getProgress(): Promise<{
    overallStatus: string;
    completedSubTasks: number;
    totalSubTasks: number;
    progressPercentage: number;
  }> {
    const state = await this.store.getState();
    if (!state) {
      return {
        overallStatus: 'pending',
        completedSubTasks: 0,
        totalSubTasks: 0,
        progressPercentage: 0
      };
    }

    const completed = state.completedSubTasks.length;
    const total = state.subTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      overallStatus: state.overallStatus,
      completedSubTasks: completed,
      totalSubTasks: total,
      progressPercentage: percentage
    };
  }
}