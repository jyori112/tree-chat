'use client';

import { useRef, useEffect, useState } from 'react';

interface EditableSessionTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  className?: string;
}

export function EditableSessionTitle({ title, onSave, className }: EditableSessionTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLHeadingElement>(null);
  const originalTitle = useRef(title);

  // Update content when title prop changes
  useEffect(() => {
    if (contentRef.current && !isEditing) {
      contentRef.current.textContent = title;
    }
    originalTitle.current = title;
  }, [title, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    if (contentRef.current) {
      // Select all text when focusing
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (contentRef.current) {
      const newTitle = contentRef.current.textContent?.trim() || '';
      if (newTitle && newTitle !== originalTitle.current) {
        onSave(newTitle);
      } else {
        // Revert to original if empty or unchanged
        contentRef.current.textContent = originalTitle.current;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (contentRef.current) {
        contentRef.current.textContent = originalTitle.current;
        contentRef.current.blur();
      }
    }
  };

  const handleInput = () => {
    if (contentRef.current) {
      // Prevent line breaks in title
      const content = contentRef.current.textContent || '';
      const singleLine = content.replace(/\n/g, ' ').slice(0, 200);
      if (content !== singleLine) {
        contentRef.current.textContent = singleLine;
        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(contentRef.current);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  return (
    <h1
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning={true}
      data-testid="session-title"
      className={`text-2xl font-bold text-foreground cursor-text hover:bg-muted/30 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors outline-none ${className}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      style={{
        minHeight: '1em',
        wordBreak: 'break-word'
      }}
    >
      {title}
    </h1>
  );
}