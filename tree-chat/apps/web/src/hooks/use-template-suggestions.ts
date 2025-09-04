'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFileSystem } from '@/lib/data-store';

export interface TemplateSuggestion {
  sectionId: string;
  currentValue: string;
  suggestion: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  type: 'empty' | 'insufficient' | 'improvement';
}

interface UseTemplateSuggestionsProps {
  sessionId: string;
  pageId: string;
  businessName: string;
  templateData: Record<string, string>;
  apiEndpoint: string; // '/api/lean-canvas' or '/api/swot-analysis' etc.
  requestType?: 'suggestion' | 'validation' | 'improvement';
}

export function useTemplateSuggestions({ 
  sessionId, 
  pageId, 
  businessName, 
  templateData,
  apiEndpoint,
  requestType = 'suggestion'
}: UseTemplateSuggestionsProps) {
  const fs = useFileSystem();
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const fieldsPath = `/sessions/${sessionId}/pages/${pageId}/fields`;

  // サジェストの生成
  const getSuggestions = useCallback(async () => {
    if (!businessName.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          canvasData: templateData, // APIが期待する名前にマッピング
          context: {
            timestamp: new Date().toISOString(),
            requestType
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.suggestions) {
          // Filter out dismissed suggestions
          const newSuggestions = result.suggestions.filter(
            (suggestion: TemplateSuggestion) => 
              !dismissedSuggestions.has(`${suggestion.sectionId}-${suggestion.type}`)
          );
          setSuggestions(newSuggestions);
        }
      }
    } catch (error) {
      console.error(`Failed to get suggestions from ${apiEndpoint}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [businessName, templateData, dismissedSuggestions, apiEndpoint, requestType]);

  // サジェストの適用
  const applySuggestion = useCallback((suggestion: TemplateSuggestion) => {
    // FileSystemに書き込み
    fs.write(`${fieldsPath}/${suggestion.sectionId}`, suggestion.suggestion);
    dismissSuggestion(suggestion);
  }, [fs, fieldsPath]);

  // サジェストの却下
  const dismissSuggestion = useCallback((suggestion: TemplateSuggestion) => {
    const suggestionKey = `${suggestion.sectionId}-${suggestion.type}`;
    setDismissedSuggestions(prev => new Set([...prev, suggestionKey]));
    setSuggestions(prev => prev.filter(s => 
      `${s.sectionId}-${s.type}` !== suggestionKey
    ));
  }, []);

  // Auto-generate suggestions when template data or business name changes
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