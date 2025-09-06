'use client';

import React, { useState } from 'react';
import { Task, TaskStatus, TaskTree } from '@/types/task';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Check, X, Circle, Clock, Play, CheckCircle } from 'lucide-react';

interface TaskCardProps {
  taskTree: TaskTree;
  level?: number;
  onCreateChild: (parentId: string, name: string, description: string) => Promise<void>;
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  onUpdateResult: (taskId: string, result: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

const statusConfig: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  todo: { 
    label: 'ToDo', 
    icon: <Circle className="w-4 h-4" />, 
    color: 'bg-gray-100 text-gray-600' 
  },
  pending: { 
    label: 'Pending', 
    icon: <Clock className="w-4 h-4" />, 
    color: 'bg-yellow-100 text-yellow-600' 
  },
  in_progress: { 
    label: 'In Progress', 
    icon: <Play className="w-4 h-4" />, 
    color: 'bg-blue-100 text-blue-600' 
  },
  completed: { 
    label: 'Completed', 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'bg-green-100 text-green-600' 
  }
};

export function TaskCard({
  taskTree,
  level = 0,
  onCreateChild,
  onUpdateStatus,
  onUpdateResult,
  onUpdateTask,
  onDelete
}: TaskCardProps) {
  const { task, children } = taskTree;
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  
  const [editName, setEditName] = useState(task.name);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editResult, setEditResult] = useState(task.result);
  const [newChildName, setNewChildName] = useState('');
  const [newChildDescription, setNewChildDescription] = useState('');

  const handleSaveName = async () => {
    await onUpdateTask(task.id, { name: editName });
    setIsEditingName(false);
  };

  const handleSaveDescription = async () => {
    await onUpdateTask(task.id, { description: editDescription });
    setIsEditingDescription(false);
  };

  const handleSaveResult = async () => {
    await onUpdateResult(task.id, editResult);
    setIsEditingResult(false);
  };

  const handleAddChild = async () => {
    if (newChildName.trim()) {
      await onCreateChild(task.id, newChildName, newChildDescription);
      setNewChildName('');
      setNewChildDescription('');
      setShowAddChild(false);
      setIsExpanded(true);
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    await onUpdateStatus(task.id, status);
  };

  return (
    <div className={`${level > 0 ? 'ml-6' : ''}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2 hover:shadow-md transition-shadow">
        <div className="p-4">
          {/* ヘッダー */}
          <div className="flex items-start gap-3">
            {/* 展開/折りたたみボタン */}
            {children.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            )}
            
            {/* メインコンテンツ */}
            <div className="flex-1">
              {/* タスク名 */}
              <div className="flex items-center gap-2 mb-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditName(task.name);
                        setIsEditingName(false);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-800">{task.name}</h3>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
                
                {/* ステータスバッジ */}
                <div className="ml-auto">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[task.status].color} cursor-pointer`}
                  >
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <option key={value} value={value}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 説明文 */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">やるべきこと・問い</label>
                {isEditingDescription ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={handleSaveDescription}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditDescription(task.description);
                          setIsEditingDescription(false);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="text-gray-700 bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
                  >
                    {task.description || <span className="text-gray-400">クリックして追加</span>}
                  </div>
                )}
              </div>

              {/* 実行結果 */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1 block">実行結果</label>
                {isEditingResult ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editResult}
                      onChange={(e) => setEditResult(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={handleSaveResult}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditResult(task.result);
                          setIsEditingResult(false);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingResult(true)}
                    className={`p-2 rounded cursor-pointer ${
                      task.result 
                        ? 'bg-green-50 text-gray-700 hover:bg-green-100' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {task.result || 'クリックして結果を追加'}
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddChild(!showAddChild)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-3 h-3" />
                  サブタスク追加
                </button>
                <button
                  onClick={() => onDelete(task.id)}
                  className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                  削除
                </button>
              </div>

              {/* サブタスク追加フォーム */}
              {showAddChild && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <input
                    type="text"
                    placeholder="サブタスク名"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    className="w-full px-3 py-2 mb-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="やるべきこと・問い"
                    value={newChildDescription}
                    onChange={(e) => setNewChildDescription(e.target.value)}
                    className="w-full px-3 py-2 mb-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddChild}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      追加
                    </button>
                    <button
                      onClick={() => {
                        setShowAddChild(false);
                        setNewChildName('');
                        setNewChildDescription('');
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 子タスク */}
      {isExpanded && children.length > 0 && (
        <div className="pl-2 border-l-2 border-gray-200 ml-3">
          {children.map(childTree => (
            <TaskCard
              key={childTree.task.id}
              taskTree={childTree}
              level={level + 1}
              onCreateChild={onCreateChild}
              onUpdateStatus={onUpdateStatus}
              onUpdateResult={onUpdateResult}
              onUpdateTask={onUpdateTask}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}