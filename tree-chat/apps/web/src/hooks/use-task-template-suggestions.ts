'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTasks } from './use-tasks';
import { useSessionData } from './use-session-data';
import { TemplateSuggestion } from './use-template-suggestions';

export interface TaskSuggestionData {
  type: 'new_task' | 'update_result' | 'change_status' | 'add_subtask';
  taskId?: string;
  parentId?: string;
  name?: string;
  description?: string;
  result?: string;
  status?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  relatedPageIds: string[];
}

interface UseTaskTemplateSuggestionsProps {
  sessionId: string;
  pageId: string;
  businessName: string;
  templateData: Record<string, string>;
  apiEndpoint: string;
}

/**
 * Task管理専用のsuggestion hook
 * BaseTemplateの統一インターフェースに準拠しながら、
 * task-specific なデータ形式を処理
 */
export function useTaskTemplateSuggestions({ 
  sessionId, 
  pageId, 
  businessName, 
  templateData,
  apiEndpoint
}: UseTaskTemplateSuggestionsProps) {
  const { tasks } = useTasks(sessionId, pageId);
  const { pages } = useSessionData(sessionId);
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // TaskSuggestionをTemplateSuggestionフォーマットに変換
  const convertToTemplateSuggestion = (taskSuggestion: TaskSuggestionData, index: number): TemplateSuggestion => {
    return {
      sectionId: `task-${index}`, // 統一されたsectionId形式
      currentValue: JSON.stringify({
        type: taskSuggestion.type,
        taskId: taskSuggestion.taskId,
        parentId: taskSuggestion.parentId
      }),
      suggestion: JSON.stringify(taskSuggestion), // タスク操作に必要な全データを含める
      reasoning: taskSuggestion.reason,
      priority: taskSuggestion.priority,
      type: taskSuggestion.type === 'new_task' ? 'empty' : 'improvement' // TemplateSuggestionのtype形式に変換
    };
  };

  // サジェストの生成
  const getSuggestions = useCallback(async () => {
    if (Object.keys(tasks).length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          currentPageId: pageId,
          tasks: Object.values(tasks),
          pages: pages,
          requestType: 'general'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.suggestions) {
          // TaskSuggestionをTemplateSuggestionに変換
          const convertedSuggestions: TemplateSuggestion[] = result.suggestions.map(
            (suggestion: TaskSuggestionData, index: number) => convertToTemplateSuggestion(suggestion, index)
          );
          
          // Filter out dismissed suggestions
          const newSuggestions = convertedSuggestions.filter(
            suggestion => !dismissedSuggestions.has(suggestion.sectionId)
          );
          setSuggestions(newSuggestions);
        }
      }
    } catch (error) {
      console.error(`Failed to get task suggestions:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [tasks, pages, dismissedSuggestions, apiEndpoint, sessionId, pageId]);

  // サジェストの適用（task-specificロジック）
  const applySuggestion = useCallback(async (suggestion: TemplateSuggestion) => {
    // TaskManagementPanelで処理されるため、ここでは却下のみ
    dismissSuggestion(suggestion);
  }, []);

  // サジェストの却下
  const dismissSuggestion = useCallback((suggestion: TemplateSuggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestion.sectionId]));
    setSuggestions(prev => prev.filter(s => s.sectionId !== suggestion.sectionId));
  }, []);

  // Auto-generate suggestions when tasks or pages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getSuggestions();
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(timeoutId);
  }, [getSuggestions]);

  return { 
    suggestions, 
    isLoading, 
    applySuggestion, 
    dismissSuggestion,
    refreshSuggestions: getSuggestions 
  };
}