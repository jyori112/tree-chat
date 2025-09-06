/**
 * Deep Research Data Store
 * DeepResearchStateの管理を担当
 */

import { useFileSystem } from './data-store';
import { 
  DeepResearchState, 
  ResearchIssue, 
  ResearchStage, 
  ResearchStep,
  ResearchResult,
  ResearchReport,
  ResearchStatus,
  SubTask,
  SubTaskResult,
  ManagerOutput
} from './deep-research-types';

export class DeepResearchStore {
  constructor(
    private fs: ReturnType<typeof useFileSystem>,
    private basePath: string // /sessions/{sessionId}/pages/{pageId}/research
  ) {}

  // Initialize Research State
  async initializeResearch(): Promise<void> {
    const stateExists = await this.fs.exists(`${this.basePath}/state`);
    
    if (!stateExists) {
      const initialState: DeepResearchState = {
        issue: null,
        subTasks: [],
        activeSubTasks: [],
        completedSubTasks: [],
        managerIterations: [],
        report: null,
        overallStatus: 'pending',
        executionMetadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '2.0.0'
        }
      };
      
      await this.fs.write(`${this.basePath}/state`, initialState);
      await this.fs.mkdir(`${this.basePath}/sources`);
      await this.fs.mkdir(`${this.basePath}/artifacts`);
    }
  }

  // Get Current State
  async getState(): Promise<DeepResearchState | null> {
    try {
      return await this.fs.read(`${this.basePath}/state`);
    } catch {
      return null;
    }
  }

  // Update State
  async updateState(updates: Partial<DeepResearchState>): Promise<void> {
    const currentState = await this.getState();
    if (!currentState) {
      throw new Error('Research state not initialized');
    }

    const updatedState: DeepResearchState = {
      ...currentState,
      ...updates,
      executionMetadata: {
        ...currentState.executionMetadata,
        updatedAt: new Date().toISOString()
      }
    };

    await this.fs.write(`${this.basePath}/state`, updatedState);
  }

  // Issue Management
  async setIssue(issue: ResearchIssue): Promise<void> {
    await this.updateState({ 
      issue,
      overallStatus: 'planning' as ResearchStatus,
      executionMetadata: {
        ...((await this.getState())?.executionMetadata || {}),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }

  // SubTask Management
  async addSubTasks(subTasks: SubTask[]): Promise<void> {
    const state = await this.getState();
    if (!state) throw new Error('Research state not initialized');

    const existingSubTasks = state.subTasks || [];
    const newSubTasks = [...existingSubTasks, ...subTasks];

    await this.updateState({
      subTasks: newSubTasks,
      overallStatus: 'researching' as ResearchStatus
    });
  }

  async startSubTask(subTaskId: string): Promise<void> {
    const state = await this.getState();
    if (!state) return;

    const activeSubTasks = [...(state.activeSubTasks || [])];
    if (!activeSubTasks.includes(subTaskId)) {
      activeSubTasks.push(subTaskId);
    }

    // Update subtask status
    const updatedSubTasks = state.subTasks.map(task => {
      if (task.id === subTaskId) {
        return {
          ...task,
          status: 'in_progress' as const,
          startedAt: new Date().toISOString()
        };
      }
      return task;
    });

    await this.updateState({
      activeSubTasks,
      subTasks: updatedSubTasks
    });
  }

  async completeSubTask(subTaskId: string, result: SubTaskResult): Promise<void> {
    const state = await this.getState();
    if (!state) return;

    // Update subtask with result
    const updatedSubTasks = state.subTasks.map(task => {
      if (task.id === subTaskId) {
        return {
          ...task,
          status: 'completed' as const,
          completedAt: new Date().toISOString(),
          result
        };
      }
      return task;
    });

    // Remove from active, add to completed
    const activeSubTasks = (state.activeSubTasks || []).filter(id => id !== subTaskId);
    const completedSubTasks = [...(state.completedSubTasks || []), subTaskId];

    // Add any additional tasks from the result
    if (result.additionalTasks && result.additionalTasks.length > 0) {
      updatedSubTasks.push(...result.additionalTasks);
    }

    await this.updateState({
      subTasks: updatedSubTasks,
      activeSubTasks,
      completedSubTasks
    });
  }

  async addManagerIteration(iteration: ManagerOutput): Promise<void> {
    const state = await this.getState();
    if (!state) return;

    const managerIterations = [...(state.managerIterations || []), iteration];
    
    await this.updateState({
      managerIterations
    });

    // If manager says continue and has new subtasks, add them
    if (iteration.decision === 'continue' && iteration.subTasks) {
      await this.addSubTasks(iteration.subTasks);
    }
  }

  // Get SubTasks by status
  getSubTasksByStatus(state: DeepResearchState, status: string): SubTask[] {
    return (state.subTasks || []).filter(task => task.status === status);
  }

  getCompletedSubTasksWithResults(state: DeepResearchState): SubTask[] {
    return (state.subTasks || []).filter(task => 
      task.status === 'completed' && task.result
    );
  }

  // Start Research Process
  async startResearchProcess(): Promise<void> {
    await this.updateState({
      overallStatus: 'planning' as ResearchStatus
    });
  }

  // Generate Report
  async setReport(report: ResearchReport): Promise<void> {
    await this.updateState({
      report,
      overallStatus: 'completed' as ResearchStatus,
      executionMetadata: {
        ...((await this.getState())?.executionMetadata || {}),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  }

  // Save Artifact (source, document, etc.)
  async saveArtifact(filename: string, content: any): Promise<void> {
    await this.fs.write(`${this.basePath}/artifacts/${filename}`, content);
  }
}

// Hook for easy usage
export function useDeepResearchStore(sessionId: string, pageId: string) {
  const fs = useFileSystem();
  const basePath = `/sessions/${sessionId}/pages/${pageId}/research`;
  
  return new DeepResearchStore(fs, basePath);
}