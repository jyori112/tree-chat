'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { useFileSystem } from '@/lib/data-store';

interface EditableDisplayNameProps {
  path: string; // display_nameファイルのパス
  defaultName: string; // デフォルト表示名
  className?: string;
  onUpdate?: (newName: string) => void;
}

export function EditableDisplayName({ 
  path, 
  defaultName, 
  className = '',
  onUpdate 
}: EditableDisplayNameProps) {
  const fs = useFileSystem();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(defaultName);
  const [editValue, setEditValue] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // display_nameファイルを読み込み
  useEffect(() => {
    const loadDisplayName = async () => {
      try {
        const name = await fs.read(path);
        setDisplayName(name);
        setEditValue(name);
      } catch {
        // ファイルが存在しない場合はデフォルト値を使用
        setDisplayName(defaultName);
        setEditValue(defaultName);
      }
    };
    loadDisplayName();
  }, [fs, path, defaultName]);

  // 編集モード開始
  const startEdit = () => {
    setIsEditing(true);
    setEditValue(displayName);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  // 保存
  const saveEdit = async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      setEditValue(displayName);
      setIsEditing(false);
      return;
    }

    try {
      await fs.write(path, trimmedValue);
      setDisplayName(trimmedValue);
      setIsEditing(false);
      onUpdate?.(trimmedValue);
    } catch (error) {
      console.error('Failed to save display name:', error);
      alert('名前の保存に失敗しました');
      setEditValue(displayName);
      setIsEditing(false);
    }
  };

  // キャンセル
  const cancelEdit = () => {
    setEditValue(displayName);
    setIsEditing(false);
  };

  // Enterキーで保存、Escapeキーでキャンセル
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          autoFocus
        />
        <button
          onClick={saveEdit}
          className="p-1 text-green-600 hover:bg-green-100 rounded"
          title="保存"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={cancelEdit}
          className="p-1 text-red-600 hover:bg-red-100 rounded"
          title="キャンセル"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 group">
      <span className={className}>{displayName}</span>
      <button
        onClick={startEdit}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-opacity"
        title="名前を編集"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}