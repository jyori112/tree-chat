'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystem } from '@/lib/data-store';
import { useDeepResearchStore } from '@/lib/deep-research-store';
import { DeepResearchOrchestrator } from '@/lib/deep-research-orchestrator';
import { 
  DeepResearchState, 
  ResearchIssue, 
  SubTask 
} from '@/lib/deep-research-types';

import { ResearchIssueForm } from './research-issue-form';
import { SubTaskList } from './subtask-list';
import { ResearchReportComponent } from './research-report';

export function DeepResearchPage() {
  const params = useParams();
  const fs = useFileSystem();
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
  const researchStore = useDeepResearchStore(sessionId, pageId);
  const [state, setState] = useState<DeepResearchState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orchestrator, setOrchestrator] = useState<DeepResearchOrchestrator | null>(null);
  const [isResearching, setIsResearching] = useState(false);

  // Initialize page and orchestrator
  useEffect(() => {
    let isMounted = true;
    
    const initializePage = async () => {
      try {
        if (!isMounted) return;
        setIsLoading(true);
        
        // Initialize page metadata
        const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
        const pageExists = await fs.exists(`${pagePath}/type`);
        
        if (!pageExists && isMounted) {
          await fs.write(`${pagePath}/type`, 'deep-research');
          await fs.write(`${pagePath}/name`, 'Deep Research');
          await fs.write(`${pagePath}/created_at`, new Date().toISOString());
        }
        
        if (!isMounted) return;
        
        // Initialize research state
        await researchStore.initializeResearch();
        const currentState = await researchStore.getState();
        
        if (!isMounted) return;
        setState(currentState);

        // Initialize orchestrator
        const newOrchestrator = new DeepResearchOrchestrator(
          researchStore,
          (updatedState: DeepResearchState) => {
            if (isMounted) {
              setState(updatedState);
              // Check if research is still in progress
              const inProgress = ['planning', 'researching', 'analyzing', 'reporting'].includes(updatedState.overallStatus);
              setIsResearching(inProgress);
            }
          }
        );
        
        if (isMounted) {
          setOrchestrator(newOrchestrator);
        }
        
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize research page');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializePage();
    
    return () => {
      isMounted = false;
    };
  }, [sessionId, pageId]); // Remove fs and researchStore from dependencies

  // Watch for state changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const watchState = async () => {
      try {
        const watcher = fs.watch(`/sessions/${sessionId}/pages/${pageId}/research/state`, (content) => {
          if (content && typeof content === 'object') {
            setState(content as DeepResearchState);
          }
        });
        cleanup = watcher;
      } catch (error) {
        console.warn('Failed to watch research state:', error);
      }
    };

    watchState();
    
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [sessionId, pageId]); // Remove fs from dependencies

  // Event Handlers
  const handleIssueSubmit = async (issue: ResearchIssue) => {
    if (!orchestrator) {
      setError('Orchestrator not initialized');
      return;
    }

    try {
      setIsResearching(true);
      await orchestrator.startResearch(issue);
    } catch (err) {
      console.error('Failed to start research:', err);
      setError(err instanceof Error ? err.message : 'Failed to start research');
      setIsResearching(false);
    }
  };

  // Helper functions
  const getStatusMessage = (): string => {
    if (!state) return '';
    
    switch (state.overallStatus) {
      case 'pending':
        return '研究課題を設定してください';
      case 'planning':
        return 'Manager が研究計画を策定中...';
      case 'researching':
        const activeCount = state.activeSubTasks?.length || 0;
        const completedCount = state.completedSubTasks?.length || 0;
        const totalCount = state.subTasks?.length || 0;
        return `Researcher が調査実行中... (${completedCount}/${totalCount} 完了, ${activeCount} 実行中)`;
      case 'analyzing':
        return 'Manager が結果を分析中...';
      case 'reporting':
        return 'Reporter がレポートを生成中...';
      case 'completed':
        return 'リサーチ完了！';
      case 'error':
        return 'エラーが発生しました';
      default:
        return '';
    }
  };

  const getProgressPercentage = (): number => {
    if (!state || !state.subTasks || state.subTasks.length === 0) return 0;
    
    const completed = state.completedSubTasks?.length || 0;
    const total = state.subTasks.length;
    return Math.round((completed / total) * 100);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Deep Research を初期化中...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800 mb-2">エラー</h2>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Deep Research</h1>
        <p className="text-gray-600">AI-powered comprehensive research system</p>
      </div>

      {/* Status and Progress */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-blue-800 font-medium">Status</span>
          {isResearching && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-blue-600 text-sm">処理中...</span>
            </div>
          )}
        </div>
        <div className="text-blue-700">{getStatusMessage()}</div>
        
        {/* Progress Bar */}
        {state && state.subTasks && state.subTasks.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-sm text-blue-600 mb-1">
              <span>進捗</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Research Issue Form */}
      {(!state?.issue || state.overallStatus === 'pending') && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            1. 研究課題の設定
          </h2>
          <ResearchIssueForm
            issue={state?.issue || null}
            onSubmit={handleIssueSubmit}
            isSubmitting={isResearching}
          />
        </div>
      )}

      {/* Step 2: SubTasks Management */}
      {state?.issue && state.subTasks && state.subTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            2. 調査サブタスク
          </h2>
          <SubTaskList
            subTasks={state.subTasks}
            activeSubTasks={state.activeSubTasks || []}
            completedSubTasks={state.completedSubTasks || []}
          />
        </div>
      )}

      {/* Step 3: Manager Iterations */}
      {state?.managerIterations && state.managerIterations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. Manager 判定履歴
          </h2>
          <div className="space-y-3">
            {state.managerIterations.map((iteration, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    判定 {index + 1}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    iteration.decision === 'continue' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {iteration.decision === 'continue' ? '継続' : '完了'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{iteration.reasoning}</p>
                {iteration.subTasks && iteration.subTasks.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    新規タスク: {iteration.subTasks.length}件
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Final Report */}
      {state?.report && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            4. 最終レポート
          </h2>
          <ResearchReportComponent 
            report={state.report} 
            onExport={(format) => {
              console.log(`Export report as ${format}`);
              // TODO: Implement export functionality
            }}
          />
        </div>
      )}
    </div>
  );
}