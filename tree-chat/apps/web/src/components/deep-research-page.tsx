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

import { SimpleResearchIssueForm } from './simple-research-issue-form';
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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [aiInsights, setAiInsights] = useState<Array<{id: string, content: string, timestamp: string, taskId?: string}>>([]);

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
    try {
      setIsResearching(true);
      
      // 課題を設定して調査実行フェーズに遷移するだけ（実際の調査は実行しない）
      await researchStore.setIssue(issue);
      await researchStore.updateState({
        overallStatus: 'researching',
        // デモ用のサブタスクを作成
        subTasks: [
          {
            id: 'task-1',
            title: 'Web検索による基礎情報収集',
            description: 'インターネット上の公開情報から基礎的な情報を収集します',
            method: 'Web Search',
            estimatedTime: '5-10分',
            status: 'completed',
            dependencies: [],
            priority: 'high',
            result: 'Web検索により以下の基礎情報を収集しました：\n\n• 主要な定義と概念について3つの信頼できるソースから確認\n• 現在の市場規模は約1,200億円（2024年時点）\n• 主要プレイヤーは5社で市場の約70%を占有\n• 規制環境は2023年に大きく変化し、新しいガイドラインが導入\n\nこれらの情報により、全体的な概要と現状把握が完了しました。'
          },
          {
            id: 'task-2', 
            title: '専門文献の調査',
            description: '学術論文やレポートから専門的な知見を収集します',
            method: 'Document Research',
            estimatedTime: '10-15分',
            status: 'in_progress',
            dependencies: ['task-1'],
            priority: 'medium'
          },
          {
            id: 'task-3',
            title: '統計データの分析',
            description: '公的機関や調査機関のデータを分析します',
            method: 'Data Analysis',
            estimatedTime: '5-10分',
            status: 'created',
            dependencies: ['task-1'],
            priority: 'medium'
          }
        ],
        activeSubTasks: [{
          id: 'task-2',
          title: '専門文献の調査',
          description: '学術論文やレポートから専門的な知見を収集します',
          method: 'Document Research',
          estimatedTime: '10-15分',
          status: 'in_progress',
          dependencies: ['task-1'],
          priority: 'medium'
        }],
        completedSubTasks: [{
          id: 'task-1',
          title: 'Web検索による基礎情報収集',
          description: 'インターネット上の公開情報から基礎的な情報を収集します',
          method: 'Web Search',
          estimatedTime: '5-10分',
          status: 'completed',
          dependencies: [],
          priority: 'high',
          result: 'Web検索により以下の基礎情報を収集しました：\n\n• 主要な定義と概念について3つの信頼できるソースから確認\n• 現在の市場規模は約1,200億円（2024年時点）\n• 主要プレイヤーは5社で市場の約70%を占有\n• 規制環境は2023年に大きく変化し、新しいガイドラインが導入\n\nこれらの情報により、全体的な概要と現状把握が完了しました。'
        }]
      });
      
      // 状態更新のために少し待つ
      const newState = await researchStore.getState();
      setState(newState);
      setIsResearching(false);
    } catch (err) {
      console.error('Failed to start research:', err);
      setError(err instanceof Error ? err.message : 'Failed to start research');
      setIsResearching(false);
    }
  };

  // Task expansion toggle
  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // AI Findings - デモ用データを初期化時に生成
  useEffect(() => {
    // デモ用のAI生成発見を設定
    const demoFindings = [
      {
        id: '1',
        content: '市場規模1,200億円という数字が3つの独立したソースで一致している点が興味深い。信頼性が高いと判断できる。',
        timestamp: new Date().toISOString(),
        taskId: 'task-1'
      },
      {
        id: '2',
        content: '主要プレイヤー5社で70%のシェアというのは、寡占市場の典型的な構造。新規参入の障壁が高い可能性。',
        timestamp: new Date().toISOString(),
        taskId: 'task-1'
      },
      {
        id: '3',
        content: '2023年の規制変更が市場に与えた影響について、より詳細な分析が必要。今後の文献調査で重点的に調べるべき。',
        timestamp: new Date().toISOString(),
        taskId: 'task-1'
      }
    ];
    setAiInsights(demoFindings);
  }, []);

  // タスクタイトルを取得する関数
  const getTaskTitle = (taskId: string) => {
    const task = state?.subTasks?.find(t => t.id === taskId);
    return task?.title || `Task ${taskId}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // 課題設定フェーズのデザイン
  if (state?.overallStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-8 py-8">
            <h1 className="text-2xl font-medium text-gray-900">Deep Research</h1>
            <p className="text-gray-600 mt-2">研究課題の設定</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-3 text-sm text-blue-600 font-medium">課題設定</span>
              </div>
              
              <div className="w-16 h-px bg-gray-300 mx-6"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-3 text-sm text-gray-500">調査実行</span>
              </div>
              
              <div className="w-16 h-px bg-gray-300 mx-6"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <span className="ml-3 text-sm text-gray-500">結果提示</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">研究課題の詳細を入力してください</h2>
            </div>
            
            <div className="p-6">
              <SimpleResearchIssueForm 
                onSubmit={handleIssueSubmit}
                isSubmitting={isResearching}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 調査実行フェーズのデザイン
  if (['planning', 'researching', 'analyzing'].includes(state?.overallStatus || '')) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Progress Steps */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-none mx-auto px-8 py-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <span className="ml-3 text-sm text-green-600 font-medium">課題設定</span>
                </div>
                
                <div className="w-16 h-px bg-green-300 mx-6"></div>
                
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <span className="ml-3 text-sm text-blue-600 font-medium">調査実行</span>
                </div>
                
                <div className="w-16 h-px bg-gray-300 mx-6"></div>
                
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <span className="ml-3 text-sm text-gray-500">結果提示</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-none mx-auto px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
            
            {/* 1. 研究課題 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900">研究課題</h3>
              </div>
              <div className="p-4 overflow-y-auto">
                {state?.issue ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        {state.issue.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {state.issue.description}
                      </p>
                    </div>
                    
                    {state.issue.objectives && state.issue.objectives.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">達成状態</h5>
                        <ul className="space-y-1">
                          {state.issue.objectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">研究課題が設定されていません</p>
                )}
              </div>
            </div>

            {/* 2. 調査タスク（展開可能な結果表示付き） */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">調査タスク</h3>
                  <div className="text-xs text-gray-500">
                    {state?.completedSubTasks?.length || 0} / {state?.subTasks?.length || 0}
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto">
                {state?.subTasks && state.subTasks.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {state.subTasks.map((task, index) => {
                      const isActive = state.activeSubTasks?.some(activeTask => activeTask.id === task.id);
                      const isCompleted = state.completedSubTasks?.some(completedTask => completedTask.id === task.id);
                      const completedTask = state.completedSubTasks?.find(ct => ct.id === task.id);
                      const isExpanded = expandedTasks.has(task.id);
                      const hasResult = isCompleted && completedTask?.result;
                      
                      return (
                        <div 
                          key={task.id}
                          className={`${
                            isActive 
                              ? 'bg-blue-50 border-l-4 border-blue-400' 
                              : isCompleted
                                ? 'bg-green-50 border-l-4 border-green-400'
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          <div 
                            className={`p-4 ${hasResult ? 'cursor-pointer' : ''}`}
                            onClick={() => hasResult && toggleTaskExpansion(task.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isCompleted 
                                  ? 'bg-green-600 border-green-600' 
                                  : isActive
                                    ? 'bg-blue-100 border-blue-600'
                                    : 'bg-white border-gray-300'
                              }`}>
                                {isCompleted && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {isActive && !isCompleted && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                                    {task.title}
                                  </h4>
                                  {hasResult && (
                                    <svg 
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">
                                  {task.description}
                                </p>
                                
                                {isActive && (
                                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                                    <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                                    <span>実行中...</span>
                                  </div>
                                )}
                                
                                {isCompleted && hasResult && (
                                  <div className="mt-2 text-xs text-green-600 font-medium">
                                    結果を表示するにはクリックしてください
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* 展開可能な結果表示 */}
                          {hasResult && isExpanded && (
                            <div className="px-4 pb-4 border-t border-green-200 bg-green-25">
                              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                                <h5 className="text-sm font-medium text-gray-900 mb-3">調査結果</h5>
                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                  {completedTask?.result}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    調査タスクを準備中...
                  </div>
                )}
              </div>
            </div>

            {/* 3. AI生成の発見・知見 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900">AI Findings</h3>
                </div>
              </div>
              
              <div className="overflow-y-auto h-full">
                {aiInsights.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {aiInsights.map((finding) => (
                      <div key={finding.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="mb-2">
                          {finding.taskId && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                              <span className="text-xs text-orange-700 font-medium">
                                {getTaskTitle(finding.taskId)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {finding.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">
                        AIが調査を分析中...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        発見や知見が自動で表示されます
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 結果提示フェーズ（完了）の場合
  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Deep Research - 完了</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p>結果提示フェーズのデザインは後で実装します</p>
          <p>現在の状態: {state?.overallStatus}</p>
        </div>
      </div>
    </div>
  );
}