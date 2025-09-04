'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFileSystem } from '@/lib/data-store';
import type { LeanCanvasSuggestion } from '@/components/canvas-suggestions';

interface UseSwotSuggestionsProps {
  sessionId: string;
  pageId: string;
  businessName: string;
  canvasData: Record<string, string>;
}

export function useSwotSuggestions({ 
  sessionId, 
  pageId, 
  businessName, 
  canvasData
}: UseSwotSuggestionsProps) {
  const fs = useFileSystem();
  const [suggestions, setSuggestions] = useState<LeanCanvasSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const fieldsPath = `/sessions/${sessionId}/pages/${pageId}/fields`;

  // サジェストの生成（SWOT分析専用API使用）
  const getSuggestions = useCallback(async () => {
    if (!businessName.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/swot-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          canvasData,
          context: {
            timestamp: new Date().toISOString(),
            requestType: 'suggestion'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.suggestions) {
          // Filter out dismissed suggestions
          const newSuggestions = result.suggestions.filter(
            (suggestion: LeanCanvasSuggestion) => 
              !dismissedSuggestions.has(`${suggestion.sectionId}-${suggestion.type}`)
          );
          setSuggestions(newSuggestions);
        }
      }
    } catch (error) {
      console.error('Failed to get SWOT suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [businessName, canvasData, dismissedSuggestions]);

  // サジェストの適用
  const applySuggestion = (suggestion: LeanCanvasSuggestion) => {
    // FileSystemに書き込み
    fs.write(`${fieldsPath}/${suggestion.sectionId}`, suggestion.suggestion);
    dismissSuggestion(suggestion);
  };

  // サジェストの却下
  const dismissSuggestion = (suggestion: LeanCanvasSuggestion) => {
    const suggestionKey = `${suggestion.sectionId}-${suggestion.type}`;
    setDismissedSuggestions(prev => new Set([...prev, suggestionKey]));
    setSuggestions(prev => prev.filter(s => 
      `${s.sectionId}-${s.type}` !== suggestionKey
    ));
  };

  // Auto-generate suggestions when canvas data or business name changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getSuggestions();
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(timeoutId);
  }, [getSuggestions]);

  // Return inline suggestions for each field
  return { suggestions, isLoading, applySuggestion, dismissSuggestion };
}