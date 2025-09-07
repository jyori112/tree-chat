'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystem } from '@/lib/data-store/context';
import { useDeepResearchStore } from '@/lib/deep-research-store';
import { DeepResearchState, ResearchIssue, SubTask } from '@/lib/deep-research-types';
import { ResearchIssueForm } from '@/components/research-issue-form';

// Demo data functions (extracted from component file)
const createDemoTasks = (): SubTask[] => [
  {
    id: 'task-1',
    title: '市場動向の調査',
    description: 'AI技術市場の現状と今後の見通しを調査します',
    status: 'completed' as const,
    priority: 'high' as const,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result: {
      conclusion: 'AI技術市場は年率30%で成長しており、2025年までに1,200億円規模に達する見込み。主要プレイヤーは5社で市場の70%を占める。',
      evidence: [
        '複数の調査会社が同様の成長率を報告',
        '主要企業の投資額が前年比150%増加',
        '政府の支援政策による市場活性化'
      ],
      sources: [],
      confidence: 0.8,
      completedAt: new Date().toISOString()
    }
  },
  {
    id: 'task-2',
    title: '専門文献の調査',
    description: '学術論文やレポートから専門的な知見を収集します',
    status: 'in_progress' as const,
    dependencies: ['task-1'],
    priority: 'medium' as const,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    title: '統計データの分析',
    description: '公的機関や調査機関のデータを分析します',
    status: 'created' as const,
    dependencies: ['task-1'],
    priority: 'medium' as const,
    createdAt: new Date().toISOString()
  }
];

const _createDemoFindings = () => [
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

export default function DeepResearchPage() {
  const params = useParams();
  const fs = useFileSystem();
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;

  const researchStore = useDeepResearchStore(sessionId, pageId);
  const [state, setState] = useState<DeepResearchState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [_expandedTasks, _setExpandedTasks] = useState<Set<string>>(new Set());
  const [_aiInsights, _setAiInsights] = useState<Array<{id: string, content: string, timestamp: string, taskId?: string}>>([]);

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

        // Initialize research state - 簡素化して無限ループを防ぐ
        try {
          await researchStore.initializeResearch();
          const currentState = await researchStore.getState();
          
          if (!isMounted) return;
          setState(currentState);
        } catch (stateError) {
          console.warn('Research state initialization failed, using default state:', stateError);
          // フォールバック：基本的な初期状態を設定
          if (!isMounted) return;
          setState({
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
          });
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
  }, [sessionId, pageId]); // fs と researchStore を依存配列から削除

  // Event Handlers
  const handleIssueSubmit = async (issue: ResearchIssue) => {
    try {
      setIsResearching(true);

      // 状態をローカルで更新し、ファイルシステム操作を最小化
      const demoTasks = createDemoTasks();
      const newState: DeepResearchState = {
        issue,
        subTasks: demoTasks,
        activeSubTasks: demoTasks.filter(t => t.status === 'in_progress').map(t => t.id),
        completedSubTasks: demoTasks.filter(t => t.status === 'completed').map(t => t.id),
        managerIterations: [],
        report: null,
        overallStatus: 'researching',
        executionMetadata: {
          createdAt: state?.executionMetadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          version: '2.0.0'
        }
      };

      // ローカル状態を直接更新
      setState(newState);
      
      // バックグラウンドでファイルに保存（非同期、エラー無視）
      researchStore.setIssue(issue).catch(console.warn);
      researchStore.updateState({
        overallStatus: 'researching',
        subTasks: demoTasks,
        activeSubTasks: demoTasks.filter(t => t.status === 'in_progress').map(t => t.id),
        completedSubTasks: demoTasks.filter(t => t.status === 'completed').map(t => t.id)
      }).catch(console.warn);

      setIsResearching(false);
    } catch (err) {
      console.error('Failed to start research:', err);
      setError(err instanceof Error ? err.message : 'Failed to start research');
      setIsResearching(false);
    }
  };

  const _toggleTaskExpansion = (taskId: string) => {
    _setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const _addAiInsight = (insight: string, taskId?: string) => {
    const newInsight = {
      id: Date.now().toString(),
      content: insight,
      timestamp: new Date().toISOString(),
      taskId
    };
    _setAiInsights(prev => [newInsight, ...prev]);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Deep Research を初期化中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">初期化エラー</h3>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // Rest of the component JSX would go here...
  // For brevity, I'll continue with the main structure
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-8">
          <div className={`flex items-center space-x-3 ${
            !state?.issue ? 'text-blue-600' : 'text-gray-500'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              !state?.issue 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="font-medium">課題設定</span>
          </div>
          <div className={`flex items-center space-x-3 ${
            state?.issue && state?.overallStatus !== 'completed' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              state?.issue && state?.overallStatus !== 'completed'
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-400'
            }`}>
              2
            </div>
            <span className="font-medium">調査実行</span>
          </div>
          <div className={`flex items-center space-x-3 ${
            state?.overallStatus === 'completed' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              state?.overallStatus === 'completed'
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-400'
            }`}>
              3
            </div>
            <span className="font-medium">結果提示</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {!state?.issue ? (
          // Step 1: Issue Setup
          <div className="p-6">
            <ResearchIssueForm 
              issue={state?.issue || null}
              onSubmit={handleIssueSubmit}
              isSubmitting={isResearching}
            />
          </div>
        ) : (
          // Step 2 & 3: Research Execution & Results
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {state.issue.title}
              </h2>
              <p className="text-gray-600">
                {state.issue.description}
              </p>
            </div>

            {/* Research content would go here */}
            <div className="text-center py-8 text-gray-500">
              研究コンテンツは実装中です
            </div>
          </div>
        )}
      </div>
    </div>
  );
}