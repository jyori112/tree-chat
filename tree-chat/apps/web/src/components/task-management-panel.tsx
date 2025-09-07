'use client';

import React, { useState, useCallback } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useSessionData } from '@/hooks/use-session-data';
import { TaskCard } from '@/components/task-card';
import { Plus, ListTodo, RefreshCw, Lightbulb, X, Check } from 'lucide-react';
import { TaskStatus } from '@/types/task';
import { TemplateSuggestion } from '@/hooks/use-template-suggestions';

interface TaskManagementPanelProps {
  sessionId: string;
  pageId: string;
  suggestions: TemplateSuggestion[];
  isLoading: boolean;
  onApplySuggestion: (suggestion: TemplateSuggestion) => void;
  onDismissSuggestion: (suggestion: TemplateSuggestion) => void;
}

/**
 * TaskManagementPanel - 統一アーキテクチャ対応のタスク管理UI
 * BaseTemplateから渡されるpropsを使用してAI提案機能を統合
 */
export function TaskManagementPanel({
  sessionId,
  pageId,
  suggestions,
  isLoading,
  onApplySuggestion,
  onDismissSuggestion
}: TaskManagementPanelProps) {
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskResult,
    deleteTask,
    buildTaskTree,
    refresh
  } = useTasks(sessionId, pageId);

  const { pages: _pages } = useSessionData(sessionId);

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  const handleCreateTask = async () => {
    if (newTaskName.trim()) {
      await createTask(newTaskName, newTaskDescription);
      setNewTaskName('');
      setNewTaskDescription('');
      setShowNewTask(false);
    }
  };

  const handleCreateChildTask = async (parentId: string, name: string, description: string) => {
    await createTask(name, description, parentId);
  };

  // AI提案の適用（統一されたインターフェース）
  const handleApplySuggestion = useCallback(async (suggestion: TemplateSuggestion) => {
    try {
      // suggestion.suggestionの内容に基づいてタスク操作を実行
      const suggestionData = JSON.parse(suggestion.suggestion);

      switch (suggestionData.type) {
        case 'new_task':
          await createTask(suggestionData.name, suggestionData.description, suggestionData.parentId);
          break;
        case 'update_result':
          if (suggestionData.taskId && suggestionData.result) {
            await updateTaskResult(suggestionData.taskId, suggestionData.result);
          }
          break;
        case 'change_status':
          if (suggestionData.taskId && suggestionData.status) {
            await updateTaskStatus(suggestionData.taskId, suggestionData.status);
          }
          break;
        case 'add_subtask':
          if (suggestionData.parentId && suggestionData.name) {
            await createTask(suggestionData.name, suggestionData.description || '', suggestionData.parentId);
          }
          break;
      }

      // BaseTemplateの統一されたApply機能を呼び出し
      onApplySuggestion(suggestion);

    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  }, [createTask, updateTaskResult, updateTaskStatus, onApplySuggestion]);

  // タスクツリーを構築
  const taskTree = buildTaskTree();

  // ステータスフィルタリング
  const filterTaskTree = (tree: typeof taskTree): typeof taskTree => {
    if (filterStatus === 'all') return tree;

    return tree.map(node => ({
      ...node,
      children: filterTaskTree(node.children)
    })).filter(node =>
      node.task.status === filterStatus || node.children.length > 0
    );
  };

  const filteredTaskTree = filterTaskTree(taskTree);

  // 統計情報
  const stats = {
    total: Object.keys(tasks).length,
    todo: Object.values(tasks).filter(t => t.status === 'todo').length,
    pending: Object.values(tasks).filter(t => t.status === 'pending').length,
    in_progress: Object.values(tasks).filter(t => t.status === 'in_progress').length,
    completed: Object.values(tasks).filter(t => t.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
          <p>タスクを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">タスク管理</h1>
          </div>
          <button
            onClick={refresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="更新"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="text-sm text-gray-500">ToDo</div>
            <div className="text-2xl font-bold text-gray-600">{stats.todo}</div>
          </div>
          <div className="bg-yellow-100 rounded-lg p-3">
            <div className="text-sm text-yellow-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-3">
            <div className="text-sm text-blue-600">In Progress</div>
            <div className="text-2xl font-bold text-blue-700">{stats.in_progress}</div>
          </div>
          <div className="bg-green-100 rounded-lg p-3">
            <div className="text-sm text-green-600">Completed</div>
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">フィルター:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            <option value="todo">ToDo</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* 新規タスク追加ボタン */}
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新規タスク
        </button>

        {/* 新規タスク追加フォーム */}
        {showNewTask && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <input
              type="text"
              placeholder="タスク名"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="やるべきこと・答えを出さなければいけない問い"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                作成
              </button>
              <button
                onClick={() => {
                  setShowNewTask(false);
                  setNewTaskName('');
                  setNewTaskDescription('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* タスクリスト - AI提案統合版 */}
      <div className="space-y-2">
        {/* AI提案タスク（新規タスク提案）- インライン表示 */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions
              .filter(suggestion => {
                try {
                  const suggestionData = JSON.parse(suggestion.suggestion);
                  return suggestionData.type === 'new_task';
                } catch {
                  return false;
                }
              })
              .map((suggestion, index) => {
                const suggestionData = JSON.parse(suggestion.suggestion);
                return (
                  <div key={`suggestion-${index}`} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Lightbulb className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{suggestionData.name}</h3>
                          <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium inline-block mt-1">
                            AI提案
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          suggestion.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : suggestion.priority === 'medium'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {suggestion.priority === 'high' ? '高' : suggestion.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      {suggestionData.description}
                    </div>

                    {/* AI提案の統一デザイン */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 flex-1">
                          {suggestion.reasoning}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <button
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          タスクを作成
                        </button>
                        <button
                          onClick={() => onDismissSuggestion(suggestion)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          却下
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* 既存タスクリスト */}
        {filteredTaskTree.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {filterStatus === 'all'
                ? 'タスクがありません'
                : `${filterStatus}のタスクがありません`}
            </p>
          </div>
        ) : (
          filteredTaskTree.map(tree => (
            <div key={tree.task.id} className="space-y-2">
              <TaskCard
                taskTree={tree}
                onCreateChild={handleCreateChildTask}
                onUpdateStatus={updateTaskStatus}
                onUpdateResult={updateTaskResult}
                onUpdateTask={updateTask}
                onDelete={deleteTask}
              />

              {/* このタスクに関連する他のAI提案 */}
              {suggestions
                .filter(suggestion => {
                  try {
                    const suggestionData = JSON.parse(suggestion.suggestion);
                    return suggestionData.type === 'add_subtask' && suggestionData.parentId === tree.task.id;
                  } catch {
                    return false;
                  }
                })
                .map((suggestion, index) => {
                  const suggestionData = JSON.parse(suggestion.suggestion);
                  return (
                    <div key={`subtask-suggestion-${tree.task.id}-${index}`} className="ml-8 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            サブタスク提案: {suggestionData.name}
                          </p>
                          <p className="text-sm text-gray-700 mb-2">
                            {suggestionData.description}
                          </p>
                          <p className="text-xs text-gray-600">
                            {suggestion.reasoning}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <button
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          サブタスク追加
                        </button>
                        <button
                          onClick={() => onDismissSuggestion(suggestion)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          却下
                        </button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          ))
        )}
      </div>
    </div>
  );
}