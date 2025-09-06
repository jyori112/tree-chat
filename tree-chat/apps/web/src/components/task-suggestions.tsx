'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  FileText, 
  RefreshCw, 
  GitBranch,
  AlertCircle,
  ChevronRight,
  Clock,
  Target,
  CheckCircle
} from 'lucide-react';
import { Task } from '@/types/task';

interface TaskSuggestion {
  type: 'new_task' | 'update_result' | 'change_status' | 'add_subtask';
  taskId?: string;
  parentId?: string;
  name?: string;
  description?: string;
  result?: string;
  status?: 'todo' | 'pending' | 'in_progress' | 'completed';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  relatedPageIds: string[];
}

interface TaskSuggestionsProps {
  suggestions: TaskSuggestion[];
  summary: string;
  loading: boolean;
  onApplySuggestion: (suggestion: TaskSuggestion) => Promise<void>;
  onRefresh: (type?: string) => void;
  tasks: Record<string, Task>;
  pages: Array<{ id: string; name: string; type: string }>;
}

const suggestionIcons = {
  new_task: <Plus className="w-4 h-4" />,
  update_result: <FileText className="w-4 h-4" />,
  change_status: <RefreshCw className="w-4 h-4" />,
  add_subtask: <GitBranch className="w-4 h-4" />,
};

const priorityColors = {
  high: 'border-red-500 bg-red-50',
  medium: 'border-yellow-500 bg-yellow-50',
  low: 'border-blue-500 bg-blue-50',
};

const statusIcons = {
  todo: <Clock className="w-4 h-4 text-gray-500" />,
  pending: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  in_progress: <Target className="w-4 h-4 text-blue-500" />,
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
};

export function TaskSuggestions({
  suggestions,
  summary,
  loading,
  onApplySuggestion,
  onRefresh,
  tasks,
  pages,
}: TaskSuggestionsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  const handleApply = async (suggestion: TaskSuggestion, index: number) => {
    setApplyingIndex(index);
    try {
      await onApplySuggestion(suggestion);
    } finally {
      setApplyingIndex(null);
    }
  };

  const getTaskName = (taskId?: string) => {
    if (!taskId) return null;
    return tasks[taskId]?.name || 'Unknown Task';
  };

  const getPageNames = (pageIds: string[]) => {
    return pageIds
      .map(id => pages.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getSuggestionTitle = (suggestion: TaskSuggestion) => {
    switch (suggestion.type) {
      case 'new_task':
        return `新規タスク: ${suggestion.name}`;
      case 'update_result':
        return `結果を記録: ${getTaskName(suggestion.taskId)}`;
      case 'change_status':
        return `ステータス変更: ${getTaskName(suggestion.taskId)} → ${suggestion.status}`;
      case 'add_subtask':
        return `サブタスク追加: ${suggestion.name} (親: ${getTaskName(suggestion.parentId)})`;
      default:
        return '不明な提案';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-800">AI タスク提案</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefresh('next_tasks')}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            disabled={loading}
          >
            次のタスク
          </button>
          <button
            onClick={() => onRefresh('results_to_record')}
            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            disabled={loading}
          >
            記録可能な結果
          </button>
          <button
            onClick={() => onRefresh('status_updates')}
            className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            disabled={loading}
          >
            ステータス更新
          </button>
          <button
            onClick={() => onRefresh()}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={loading}
            title="すべて更新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700">{summary}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">提案を生成中...</p>
        </div>
      )}

      {/* Suggestions List */}
      {!loading && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`border-l-4 rounded-lg p-3 ${priorityColors[suggestion.priority]}`}
            >
              <div 
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-start gap-2 flex-1">
                  <div className="mt-1">
                    {suggestionIcons[suggestion.type]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {getSuggestionTitle(suggestion)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {suggestion.reason}
                    </div>
                    {suggestion.relatedPageIds.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        関連ページ: {getPageNames(suggestion.relatedPageIds)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {suggestion.priority === 'high' ? '高' :
                     suggestion.priority === 'medium' ? '中' : '低'}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedIndex === index ? 'rotate-90' : ''
                  }`} />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedIndex === index && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {suggestion.description && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700">説明:</span>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                    </div>
                  )}
                  
                  {suggestion.result && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700">結果:</span>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.result}</p>
                    </div>
                  )}
                  
                  {suggestion.status && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">新しいステータス:</span>
                      <div className="flex items-center gap-1">
                        {statusIcons[suggestion.status]}
                        <span className="text-sm text-gray-600">{suggestion.status}</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleApply(suggestion, index)}
                    disabled={applyingIndex === index}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {applyingIndex === index ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        適用中...
                      </span>
                    ) : (
                      '提案を適用'
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">現在、提案はありません</p>
          <button
            onClick={() => onRefresh()}
            className="mt-3 text-sm text-purple-600 hover:text-purple-700"
          >
            提案を生成
          </button>
        </div>
      )}
    </div>
  );
}