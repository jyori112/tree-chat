'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useFileSystem } from '@/lib/data-store';

interface FSTextInputProps {
  path: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  debounceMs?: number;
  onValueChange?: (value: string) => void;
}

/**
 * FileSystemのテキストファイルと双方向バインドするInput要素
 */
export function FSTextInput({
  path,
  placeholder = '',
  className = '',
  defaultValue = '',
  debounceMs = 500,
  onValueChange
}: FSTextInputProps) {
  const fs = useFileSystem();
  const [value, setValue] = useState(defaultValue);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // 初期読み込み
  useEffect(() => {
    const loadValue = async () => {
      try {
        const data = await fs.read(path);
        setValue(data);
        onValueChange?.(data);
      } catch {
        // ファイルが存在しない場合はdefaultValueを使用
        setValue(defaultValue);
      }
    };
    
    loadValue();

    // ファイルの変更を監視
    const unwatch = fs.watch(path, async (event) => {
      if (event.type === 'update' || event.type === 'create') {
        try {
          const newData = await fs.read(path);
          setValue(newData);
          onValueChange?.(newData);
        } catch {
          // エラー時は無視
        }
      } else if (event.type === 'delete') {
        setValue(defaultValue);
        onValueChange?.(defaultValue);
      }
    });

    return unwatch;
  }, [fs, path, defaultValue]); // onValueChangeは除外

  // 値の更新（デバウンス付き）
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onValueChange?.(newValue);

    // 既存のタイマーをクリア
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // 新しいタイマーをセット
    const timer = setTimeout(async () => {
      try {
        await fs.write(path, newValue);
      } catch (error) {
        console.error(`Failed to save to ${path}:`, error);
      }
    }, debounceMs);

    setSaveTimer(timer);
  }, [fs, path, debounceMs, saveTimer, onValueChange]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  // テキストの長さに基づいて幅を調整
  const inputStyle = {
    width: `${Math.max(300, Math.min(800, value.length * 15))}px`
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      style={inputStyle}
    />
  );
}

interface FSTextareaProps {
  path: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  debounceMs?: number;
  onValueChange?: (value: string) => void;
}

/**
 * FileSystemのテキストファイルと双方向バインドするTextarea要素
 */
export function FSTextarea({
  path,
  placeholder = '',
  className = '',
  defaultValue = '',
  debounceMs = 500,
  onValueChange
}: FSTextareaProps) {
  const fs = useFileSystem();
  const [value, setValue] = useState(defaultValue);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // 初期読み込み
  useEffect(() => {
    const loadValue = async () => {
      try {
        const data = await fs.read(path);
        setValue(data);
        onValueChange?.(data);
      } catch {
        // ファイルが存在しない場合はdefaultValueを使用
        setValue(defaultValue);
      }
    };
    
    loadValue();

    // ファイルの変更を監視
    const unwatch = fs.watch(path, async (event) => {
      if (event.type === 'update' || event.type === 'create') {
        try {
          const newData = await fs.read(path);
          setValue(newData);
          onValueChange?.(newData);
        } catch {
          // エラー時は無視
        }
      } else if (event.type === 'delete') {
        setValue(defaultValue);
        onValueChange?.(defaultValue);
      }
    });

    return unwatch;
  }, [fs, path, defaultValue]); // onValueChangeは除外

  // 値の更新（デバウンス付き）
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onValueChange?.(newValue);

    // 既存のタイマーをクリア
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // 新しいタイマーをセット
    const timer = setTimeout(async () => {
      try {
        await fs.write(path, newValue);
      } catch (error) {
        console.error(`Failed to save to ${path}:`, error);
      }
    }, debounceMs);

    setSaveTimer(timer);
  }, [fs, path, debounceMs, saveTimer, onValueChange]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}