export type TaskStatus = 'todo' | 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  name: string;
  description: string; // やらなければいけないこと・答えを出さなければいけない問い
  result: string; // タスクの実行結果
  status: TaskStatus;
  parentId?: string; // 親タスクのID
  childIds: string[]; // 子タスクのIDリスト
  createdAt: string;
  updatedAt: string;
  order: number; // 同じ親を持つタスク間での順序
}

export interface TaskTree {
  task: Task;
  children: TaskTree[];
}