'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useReadFrom } from '@/lib/data-store/swr-hooks';
import { useCommands } from '@/contexts/CommandContext';

interface SWRTextareaProps {
  path: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  debounceMs?: number;
  onValueChange?: (value: string) => void;
}

/**
 * SWR-based Textarea that uses readFrom + executeCommand pattern
 * Replaces FSTextarea with cleaner SWR implementation
 */
export function SWRTextarea({
  path,
  placeholder = '',
  className = '',
  defaultValue = '',
  debounceMs = 500,
  onValueChange
}: SWRTextareaProps) {
  const { data: serverValue, loading } = useReadFrom(path, defaultValue);
  const { executeCommand } = useCommands();
  const [localValue, setLocalValue] = useState(defaultValue);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync server value to local state
  useEffect(() => {
    if (serverValue !== undefined) {
      setLocalValue(serverValue);
      onValueChange?.(serverValue);
    }
  }, [serverValue, onValueChange]);

  // Handle local changes with debouncing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onValueChange?.(newValue);

    // Clear existing timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // Set new timer for debounced save
    const timer = setTimeout(async () => {
      try {
        await executeCommand({
          type: 'write',
          path,
          data: newValue,
          description: `Update ${path}`,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to save to ${path}:`, error);
        // Optionally revert to server value on error
        // setLocalValue(serverValue);
      }
    }, debounceMs);

    setSaveTimer(timer);
  }, [path, executeCommand, debounceMs, saveTimer, onValueChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  if (loading && !localValue) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}

interface SWRTextInputProps {
  path: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  debounceMs?: number;
  onValueChange?: (value: string) => void;
}

/**
 * SWR-based Text Input
 */
export function SWRTextInput({
  path,
  placeholder = '',
  className = '',
  defaultValue = '',
  debounceMs = 500,
  onValueChange
}: SWRTextInputProps) {
  const { data: serverValue, loading } = useReadFrom(path, defaultValue);
  const { executeCommand } = useCommands();
  const [localValue, setLocalValue] = useState(defaultValue);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync server value to local state
  useEffect(() => {
    if (serverValue !== undefined) {
      setLocalValue(serverValue);
      onValueChange?.(serverValue);
    }
  }, [serverValue, onValueChange]);

  // Handle local changes with debouncing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onValueChange?.(newValue);

    // Clear existing timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // Set new timer for debounced save
    const timer = setTimeout(async () => {
      try {
        await executeCommand({
          type: 'write',
          path,
          data: newValue,
          description: `Update ${path}`,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to save to ${path}:`, error);
      }
    }, debounceMs);

    setSaveTimer(timer);
  }, [path, executeCommand, debounceMs, saveTimer, onValueChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  if (loading && !localValue) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  // Auto-width based on content length
  const inputStyle = {
    width: `${Math.max(300, Math.min(800, localValue.length * 15))}px`
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      style={inputStyle}
    />
  );
}