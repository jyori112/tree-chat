'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTasks } from '@/hooks/use-tasks';
import { useSessionData } from '@/hooks/use-session-data';
import { TaskCard } from '@/components/task-card';
import { TaskSuggestions } from '@/components/task-suggestions';
import { Plus, ListTodo, RefreshCw } from 'lucide-react';
import { TaskStatus } from '@/types/task';
import { TaskSuggestionClient } from '@/lib/task-suggestion-client';

export default function TaskManagementPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const pageId = params?.pageId as string;
  
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

  const { pages } = useSessionData(sessionId);

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionSummary, setSuggestionSummary] = useState('');
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionClient] = useState(() => new TaskSuggestionClient());

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

  // AI提案の取得
  const fetchSuggestions = useCallback(async (requestType?: string) => {
    setSuggestionsLoading(true);
    try {
      const response = await suggestionClient.getSuggestions({
        sessionId,
        currentPageId: pageId,
        tasks: Object.values(tasks),
        pages: pages,
        requestType: requestType as any || 'general',
      });
      
      setSuggestions(response.suggestions);
      setSuggestionSummary(response.summary);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
      setSuggestionSummary('提案の取得に失敗しました');
    } finally {
      setSuggestionsLoading(false);
    }
  }, [suggestionClient, sessionId, pageId, tasks, pages]);

  // AI提案の適用
  const applySuggestion = useCallback(async (suggestion: any) => {
    switch (suggestion.type) {
      case 'new_task':
        await createTask(suggestion.name, suggestion.description, suggestion.parentId);
        break;
      case 'update_result':
        if (suggestion.taskId && suggestion.result) {
          await updateTaskResult(suggestion.taskId, suggestion.result);
        }
        break;
      case 'change_status':
        if (suggestion.taskId && suggestion.status) {
          await updateTaskStatus(suggestion.taskId, suggestion.status);
        }
        break;
      case 'add_subtask':
        if (suggestion.parentId && suggestion.name) {
          await createTask(suggestion.name, suggestion.description || '', suggestion.parentId);
        }
        break;
    }
    
    // 適用後に提案を再取得
    await fetchSuggestions();
  }, [createTask, updateTaskResult, updateTaskStatus, fetchSuggestions]);

  // 初回読み込み時に提案を取得
  useEffect(() => {
    if (!loading && Object.keys(tasks).length > 0 && pages.length > 0) {
      fetchSuggestions();
    }
  }, [loading, tasks, pages]);

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
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2">
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

      {/* タスクリスト */}
      <div className="space-y-2">
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
            <TaskCard
              key={tree.task.id}
              taskTree={tree}
              onCreateChild={handleCreateChildTask}
              onUpdateStatus={updateTaskStatus}
              onUpdateResult={updateTaskResult}
              onUpdateTask={updateTask}
              onDelete={deleteTask}
            />
          ))
        )}
          </div>
        </div>

        {/* サイドバー: AI提案 */}
        <div className="lg:col-span-1">
          <TaskSuggestions
            suggestions={suggestions}
            summary={suggestionSummary}
            loading={suggestionsLoading}
            onApplySuggestion={applySuggestion}
            onRefresh={fetchSuggestions}
            tasks={tasks}
            pages={pages.map(p => ({ id: p.id, name: p.name, type: p.type }))}
          />
        </div>
      </div>
    </div>
  );
}