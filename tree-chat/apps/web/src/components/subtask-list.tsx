'use client';

import React from 'react';
import { SubTask } from '@/lib/deep-research-types';

interface SubTaskListProps {
  subTasks: SubTask[];
  activeSubTasks: string[];
  completedSubTasks: string[];
}

export function SubTaskList({ subTasks, activeSubTasks, completedSubTasks }: SubTaskListProps) {
  const _getTaskStatus = (taskId: string): 'pending' | 'active' | 'completed' => {
    if (completedSubTasks.includes(taskId)) return 'completed';
    if (activeSubTasks.includes(taskId)) return 'active';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>;
      case 'in_progress':
        return <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>;
      case 'created':
      case 'pending':
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full"></div>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'in_progress': return '実行中';
      case 'created': return '待機中';
      case 'failed': return '失敗';
      default: return '不明';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '不明';
    }
  };

  if (!subTasks || subTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        サブタスクはまだ作成されていません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          サブタスク一覧 ({subTasks.length})
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <span className="text-gray-600">待機中</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">実行中</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">完了</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {subTasks.map((task, index) => (
          <div 
            key={task.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  {getStatusIcon(task.status)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {task.description}
                  </p>

                  {/* Task Dependencies */}
                  {task.dependencies && task.dependencies.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-500">依存関係:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {task.dependencies.map(depId => {
                          const depTask = subTasks.find(t => t.id === depId);
                          return (
                            <span 
                              key={depId}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {depTask?.title || depId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Task Timestamps */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div>作成: {new Date(task.createdAt).toLocaleString()}</div>
                    {task.startedAt && (
                      <div>開始: {new Date(task.startedAt).toLocaleString()}</div>
                    )}
                    {task.completedAt && (
                      <div>完了: {new Date(task.completedAt).toLocaleString()}</div>
                    )}
                  </div>

                  {/* Task Result */}
                  {task.result && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-green-800">調査結果</h5>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-green-600">
                            信頼度: {Math.round(task.result.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-green-700 mb-3">
                        {task.result.conclusion}
                      </p>

                      {task.result.evidence && task.result.evidence.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-green-800 mb-1">主要な証拠:</h6>
                          <ul className="list-disc list-inside space-y-1">
                            {task.result.evidence.slice(0, 3).map((evidence, idx) => (
                              <li key={idx} className="text-xs text-green-700">{evidence}</li>
                            ))}
                            {task.result.evidence.length > 3 && (
                              <li className="text-xs text-green-600">
                                ...他 {task.result.evidence.length - 3} 件
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {task.result.sources && task.result.sources.length > 0 && (
                        <div>
                          <h6 className="text-xs font-medium text-green-800 mb-1">
                            情報源 ({task.result.sources.length}):
                          </h6>
                          <div className="space-y-1">
                            {task.result.sources.slice(0, 2).map((source, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <span className="text-xs text-green-700 truncate">
                                  {source.title}
                                </span>
                                {source.url && (
                                  <a 
                                    href={source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-600 hover:text-green-800"
                                  >
                                    🔗
                                  </a>
                                )}
                                <span className="text-xs text-green-600">
                                  ({Math.round(source.relevance * 100)}%)
                                </span>
                              </div>
                            ))}
                            {task.result.sources.length > 2 && (
                              <div className="text-xs text-green-600">
                                ...他 {task.result.sources.length - 2} 個の情報源
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {task.result.additionalTasks && task.result.additionalTasks.length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <h6 className="text-xs font-medium text-blue-800 mb-1">
                            追加調査が推奨される課題:
                          </h6>
                          {task.result.additionalTasks.map((addTask, idx) => (
                            <div key={idx} className="text-xs text-blue-700">
                              • {addTask.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {subTasks.length}
            </div>
            <div className="text-sm text-gray-600">総タスク数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {activeSubTasks.length}
            </div>
            <div className="text-sm text-gray-600">実行中</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {completedSubTasks.length}
            </div>
            <div className="text-sm text-gray-600">完了</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">
              {Math.round((completedSubTasks.length / Math.max(subTasks.length, 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-600">完了率</div>
          </div>
        </div>
      </div>
    </div>
  );
}