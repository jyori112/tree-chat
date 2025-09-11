'use client';

import { useRef, useEffect, useState } from 'react';

interface EditableSessionDescriptionProps {
  description: string;
  onSave: (newDescription: string) => void;
  className?: string;
}

export function EditableSessionDescription({ description, onSave, className }: EditableSessionDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const originalDescription = useRef(description);

  // Update content when description prop changes
  useEffect(() => {
    if (contentRef.current && !isEditing) {
      if (description) {
        contentRef.current.textContent = description;
      } else {
        contentRef.current.innerHTML = '<span class="text-muted-foreground italic">Add a description</span>';
      }
    }
    originalDescription.current = description;
  }, [description, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    if (contentRef.current) {
      // Clear placeholder and focus
      if (!description) {
        contentRef.current.textContent = '';
      }
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
      const newDescription = contentRef.current.textContent?.trim() || '';
      if (newDescription !== originalDescription.current) {
        onSave(newDescription);
      } else {
        // Revert to original content
        if (originalDescription.current) {
          contentRef.current.textContent = originalDescription.current;
        } else {
          contentRef.current.innerHTML = '<span class="text-muted-foreground italic">Add a description</span>';
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (contentRef.current) {
        if (originalDescription.current) {
          contentRef.current.textContent = originalDescription.current;
        } else {
          contentRef.current.innerHTML = '<span class="text-muted-foreground italic">Add a description</span>';
        }
        contentRef.current.blur();
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      // Cmd/Ctrl + Enter to save
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleInput = () => {
    if (contentRef.current) {
      // Limit content length
      const content = contentRef.current.textContent || '';
      if (content.length > 2000) {
        const trimmed = content.slice(0, 2000);
        contentRef.current.textContent = trimmed;
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
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning={true}
      data-testid="session-description"
      className={`text-sm text-foreground cursor-text hover:bg-muted/30 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors outline-none whitespace-pre-wrap ${className}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      style={{
        minHeight: '1.25rem',
        wordBreak: 'break-word'
      }}
      dangerouslySetInnerHTML={{
        __html: description 
          ? description 
          : '<span class="text-muted-foreground italic">Add a description</span>'
      }}
    />
  );
}