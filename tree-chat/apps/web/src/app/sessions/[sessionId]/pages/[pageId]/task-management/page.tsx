'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TaskTemplate } from '@/components/task-template';

function TaskManagementContent() {
  return (
    <TaskTemplate>
      {/* 追加のカスタムコンテンツがあればここに配置 */}
    </TaskTemplate>
  );
}

export default function TaskManagementPage() {
  return (
    <FileSystemProvider>
      <TaskManagementContent />
    </FileSystemProvider>
  );
}