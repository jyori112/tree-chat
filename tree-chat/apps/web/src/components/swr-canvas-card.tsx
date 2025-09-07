'use client';

import React from 'react';
import { SWRTextarea } from '@/components/swr-inputs';
import { Lightbulb, Check, X } from 'lucide-react';
import type { LeanCanvasSuggestion } from '@/components/canvas-suggestions';

interface SWRCanvasCardProps {
  title: string;
  placeholder: string;
  gridArea: string;
  color: string;
  fieldPath: string;
  suggestion?: LeanCanvasSuggestion;
  isLoading?: boolean;
  onApplySuggestion?: (suggestion: LeanCanvasSuggestion) => void;
  onDismissSuggestion?: (suggestion: LeanCanvasSuggestion) => void;
}

/**
 * SWR-based Canvas Card component
 * Replaces CanvasCard with SWRTextarea
 */
export function SWRCanvasCard({
  title,
  placeholder,
  gridArea,
  color,
  fieldPath,
  suggestion,
  isLoading = false,
  onApplySuggestion,
  onDismissSuggestion,
}: SWRCanvasCardProps) {
  return (
    <div
      className={`${color} border rounded-xl p-3 flex flex-col transition-all hover:shadow-md shadow-sm relative`}
      style={{ gridArea }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          {title}
        </h3>
        {isLoading && (
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
        )}
      </div>
      
      <SWRTextarea
        path={fieldPath}
        placeholder={placeholder}
        className="flex-1 w-full bg-transparent rounded-lg p-2 text-sm resize-none border-0 focus:outline-none focus:ring-0 transition-all placeholder:text-gray-400 mb-2"
        defaultValue=""
        debounceMs={300}
      />

      {/* Inline Suggestion */}
      {suggestion && (
        <div className="border-t border-gray-200 pt-2 mt-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700 flex-1">
                {suggestion.suggestion}
              </p>
            </div>
            <div className="flex gap-1 ml-5">
              <button
                onClick={() => onApplySuggestion?.(suggestion)}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                title="提案を適用"
              >
                <Check className="w-3 h-3" />
                適用
              </button>
              <button
                onClick={() => onDismissSuggestion?.(suggestion)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                title="提案を却下"
              >
                <X className="w-3 h-3" />
                却下
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}