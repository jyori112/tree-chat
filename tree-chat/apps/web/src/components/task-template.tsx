'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystem } from '@/lib/data-store';
import { useTaskTemplateSuggestions } from '@/hooks/use-task-template-suggestions';
import { TaskManagementPanel } from './task-management-panel';

interface TaskTemplateProps {
  children?: React.ReactNode;
}

/**
 * TaskTemplate - 統一アーキテクチャに準拠したタスク管理
 * 他のFrameworkページと同じパターンを使用しつつ、task専用の処理を実装
 */
export function TaskTemplate({ children }: TaskTemplateProps) {
  const params = useParams();
  const fs = useFileSystem();
  const [businessName, setBusinessName] = useState('');
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
  // パスの定義（BaseTemplateと同じパターン）
  const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
  const fieldsPath = `${pagePath}/fields`;
  const sharedPath = `/sessions/${sessionId}/shared`;
  
  // Task専用のsuggestion hook
  const { suggestions, isLoading, applySuggestion, dismissSuggestion } = useTaskTemplateSuggestions({
    sessionId,
    pageId,
    businessName,
    templateData,
    apiEndpoint: '/api/task-suggestions'
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 text-center">
        プロジェクトのタスクを階層的に管理し、AIによる提案を活用
      </p>

      {/* Custom content */}
      {children}

      {/* Task Management Panel - 統一されたpropsを使用 */}
      <TaskManagementPanel
        sessionId={sessionId}
        pageId={pageId}
        suggestions={suggestions}
        isLoading={isLoading}
        onApplySuggestion={applySuggestion}
        onDismissSuggestion={dismissSuggestion}
      />

      {/* Debug Info */}
      <div className="text-xs text-gray-400 font-mono mt-4">
        Session: {sessionId} | Page: {pageId} | Type: task-management
      </div>
    </div>
  );
}