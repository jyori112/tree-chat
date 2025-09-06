'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFileSystem } from '@/lib/data-store';
import { Task, TaskStatus, TaskTree } from '@/types/task';

export function useTasks(sessionId: string, pageId: string) {
  const fs = useFileSystem();
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  
  const tasksPath = `/sessions/${sessionId}/pages/${pageId}/tasks`;

  // タスクの読み込み
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const exists = await fs.exists(tasksPath);
      if (!exists) {
        await fs.mkdir(tasksPath);
        setTasks({});
        return;
      }

      const taskIds = await fs.ls(tasksPath);
      const loadedTasks: Record<string, Task> = {};

      for (const taskId of taskIds) {
        try {
          const taskData = await fs.read(`${tasksPath}/${taskId}`);
          loadedTasks[taskId] = taskData;
        } catch (error) {
          console.error(`Failed to load task ${taskId}:`, error);
        }
      }

      setTasks(loadedTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [fs, tasksPath]);

  // 初回読み込み
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // タスクの作成
  const createTask = useCallback(async (
    name: string,
    description: string,
    parentId?: string
  ): Promise<string> => {
    const taskId = Math.random().toString(36).substring(2, 10);
    
    // 親タスクの子タスク数を取得して順序を決定
    let order = 0;
    if (parentId && tasks[parentId]) {
      order = tasks[parentId].childIds.length;
    } else if (!parentId) {
      // ルートレベルのタスク数を数える
      order = Object.values(tasks).filter(t => !t.parentId).length;
    }

    const newTask: Task = {
      id: taskId,
      name,
      description,
      result: '',
      status: 'todo',
      parentId,
      childIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order
    };

    // タスクを保存
    await fs.write(`${tasksPath}/${taskId}`, newTask);

    // 親タスクの子リストを更新
    if (parentId && tasks[parentId]) {
      const parentTask = { ...tasks[parentId] };
      parentTask.childIds.push(taskId);
      parentTask.updatedAt = new Date().toISOString();
      await fs.write(`${tasksPath}/${parentId}`, parentTask);
      
      setTasks(prev => ({
        ...prev,
        [taskId]: newTask,
        [parentId]: parentTask
      }));
    } else {
      setTasks(prev => ({
        ...prev,
        [taskId]: newTask
      }));
    }

    return taskId;
  }, [fs, tasksPath, tasks]);

  // タスクの更新
  const updateTask = useCallback(async (
    taskId: string,
    updates: Partial<Task>
  ) => {
    const task = tasks[taskId];
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await fs.write(`${tasksPath}/${taskId}`, updatedTask);
    
    setTasks(prev => ({
      ...prev,
      [taskId]: updatedTask
    }));
  }, [fs, tasksPath, tasks]);

  // タスクのステータス更新
  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: TaskStatus
  ) => {
    await updateTask(taskId, { status });
  }, [updateTask]);

  // タスクの結果更新
  const updateTaskResult = useCallback(async (
    taskId: string,
    result: string
  ) => {
    await updateTask(taskId, { result });
  }, [updateTask]);

  // タスクの削除
  const deleteTask = useCallback(async (taskId: string) => {
    const task = tasks[taskId];
    if (!task) return;

    // 子タスクも再帰的に削除
    for (const childId of task.childIds) {
      await deleteTask(childId);
    }

    // 親タスクから参照を削除
    if (task.parentId && tasks[task.parentId]) {
      const parentTask = { ...tasks[task.parentId] };
      parentTask.childIds = parentTask.childIds.filter(id => id !== taskId);
      parentTask.updatedAt = new Date().toISOString();
      await fs.write(`${tasksPath}/${task.parentId}`, parentTask);
    }

    // タスクファイルを削除
    await fs.rm(`${tasksPath}/${taskId}`);

    setTasks(prev => {
      const newTasks = { ...prev };
      delete newTasks[taskId];
      if (task.parentId && newTasks[task.parentId]) {
        newTasks[task.parentId] = {
          ...newTasks[task.parentId],
          childIds: newTasks[task.parentId].childIds.filter(id => id !== taskId)
        };
      }
      return newTasks;
    });
  }, [fs, tasksPath, tasks]);

  // タスクツリーの構築
  const buildTaskTree = useCallback((): TaskTree[] => {
    const rootTasks = Object.values(tasks)
      .filter(task => !task.parentId)
      .sort((a, b) => a.order - b.order);

    const buildTree = (task: Task): TaskTree => {
      const children = task.childIds
        .map(childId => tasks[childId])
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map(child => buildTree(child));

      return { task, children };
    };

    return rootTasks.map(task => buildTree(task));
  }, [tasks]);

  // タスクの順序変更
  const reorderTask = useCallback(async (
    taskId: string,
    newOrder: number
  ) => {
    const task = tasks[taskId];
    if (!task) return;

    // 同じ親を持つタスクを取得
    const siblings = Object.values(tasks).filter(t => 
      t.parentId === task.parentId && t.id !== taskId
    );

    // 順序を調整
    siblings.sort((a, b) => a.order - b.order);
    
    // 新しい位置に挿入
    siblings.splice(newOrder, 0, task);
    
    // 順序を再割り当て
    const updates: Promise<void>[] = [];
    siblings.forEach((t, index) => {
      if (t.order !== index) {
        t.order = index;
        t.updatedAt = new Date().toISOString();
        updates.push(fs.write(`${tasksPath}/${t.id}`, t));
      }
    });

    await Promise.all(updates);
    await loadTasks();
  }, [fs, tasksPath, tasks, loadTasks]);

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    updateTaskResult,
    deleteTask,
    buildTaskTree,
    reorderTask,
    refresh: loadTasks
  };
}