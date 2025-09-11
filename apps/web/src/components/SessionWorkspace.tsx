/**
 * SessionWorkspace Component
 * 
 * Main workspace interface for individual sessions with auto-save functionality.
 * Integrates with the data hook infrastructure for session data management.
 * 
 * @see Requirements: 2.1, 2.2, 2.5, 4.4 (workspace display, editing, auto-save)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Session, AutoSaveState } from '@/types/session';
import { useReadWithDefault, useWritePath } from '@/hooks/data';
import { 
  updateSessionTimestamps,
  mergeSessionUpdates,
  getSessionDataPath 
} from '@/utils/session-utils';
import { 
  validateSessionTitle,
  validateSessionDescription,
  sanitizeInput 
} from '@/utils/session-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface SessionWorkspaceProps {
  /** Session ID to load and manage */
  sessionId: string;
  /** Callback when session is updated */
  onSessionUpdate?: (session: Session) => void;
  /** Whether to show the navigation breadcrumb */
  showBreadcrumb?: boolean;
  /** Custom auto-save debounce delay in milliseconds */
  autoSaveDelay?: number;
}

/**
 * Main session workspace component with auto-save and editing functionality.
 */
export function SessionWorkspace({
  sessionId,
  onSessionUpdate,
  showBreadcrumb = true,
  autoSaveDelay = 500
}: SessionWorkspaceProps) {
  const router = useRouter();
  const { userId, orgId } = useAuth();
  
  // Local editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  
  // Auto-save state
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    status: 'idle',
    enabled: true,
    retryCount: 0
  });
  
  // Refs for auto-save debouncing
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Data hooks for session management
  const { 
    data: session, 
    loading, 
    error,
    refresh 
  } = useReadWithDefault<Session>(getSessionDataPath('detail', sessionId), { 
    defaultValue: null,
    immediate: true,
    cache: true,
    cacheDuration: 10000 // 10 seconds cache
  });
  
  const { write: updateSession, loading: updating } = useWritePath(
    getSessionDataPath('detail', sessionId)
  );

  // Update local state when session data changes
  useEffect(() => {
    if (session) {
      setLocalTitle(session.title);
      setLocalDescription(session.description || '');
      
      // Track session access
      const updatedSession = updateSessionTimestamps(session, 'access');
      if (updatedSession.lastAccessedAt !== session.lastAccessedAt) {
        // Update access time without triggering auto-save
        updateSession(updatedSession).catch(console.error);
      }
    }
  }, [session, updateSession]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback(async (updates: { title?: string; description?: string }) => {
    if (!session || !autoSaveState.enabled) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutoSaveState(prev => ({ ...prev, status: 'saving' }));

      try {
        // Validate updates
        const titleValidation = updates.title !== undefined 
          ? validateSessionTitle(updates.title) 
          : null;
        const descriptionValidation = updates.description !== undefined 
          ? validateSessionDescription(updates.description) 
          : null;

        if (titleValidation || descriptionValidation) {
          setAutoSaveState(prev => ({ 
            ...prev, 
            status: 'error',
            error: titleValidation?.message || descriptionValidation?.message 
          }));
          return;
        }

        // Sanitize and prepare updates
        const sanitizedUpdates: { title?: string; description?: string } = {};
        if (updates.title !== undefined) {
          sanitizedUpdates.title = sanitizeInput(updates.title);
        }
        if (updates.description !== undefined) {
          sanitizedUpdates.description = sanitizeInput(updates.description) || undefined;
        }

        // Merge with current session data
        const updatedSession = mergeSessionUpdates(session, sanitizedUpdates);
        
        // Save to data store
        await updateSession(updatedSession);
        
        // Update callback
        onSessionUpdate?.(updatedSession);
        
        // Update auto-save state
        setAutoSaveState({
          status: 'saved',
          enabled: true,
          lastSaved: Date.now(),
          retryCount: 0
        });

      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveState(prev => ({ 
          ...prev, 
          status: 'error',
          error: 'Failed to save changes',
          retryCount: (prev.retryCount || 0) + 1
        }));

        // Auto-retry with exponential backoff (max 3 retries)
        if ((autoSaveState.retryCount || 0) < 3) {
          const retryDelay = Math.pow(2, autoSaveState.retryCount || 0) * 1000;
          setTimeout(() => {
            if (autoSaveState.enabled) {
              triggerAutoSave(updates);
            }
          }, retryDelay);
        }
      }
    }, autoSaveDelay);
  }, [session, autoSaveState.enabled, autoSaveState.retryCount, autoSaveDelay, updateSession, onSessionUpdate]);

  // Handle title editing
  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setTitleError(null);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    
    // Clear previous errors
    setTitleError(null);
    
    // Validate in real-time
    const validation = validateSessionTitle(newTitle);
    if (validation) {
      setTitleError(validation.message);
      return;
    }
    
    // Trigger auto-save
    triggerAutoSave({ title: newTitle });
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setLocalTitle(session?.title || '');
      setTitleError(null);
      setIsEditingTitle(false);
    }
  };

  // Handle description editing
  const handleDescriptionEdit = () => {
    setIsEditingDescription(true);
    setDescriptionError(null);
    setTimeout(() => descriptionTextareaRef.current?.focus(), 0);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    
    // Clear previous errors
    setDescriptionError(null);
    
    // Validate in real-time
    const validation = validateSessionDescription(newDescription);
    if (validation) {
      setDescriptionError(validation.message);
      return;
    }
    
    // Trigger auto-save
    triggerAutoSave({ description: newDescription });
  };

  const handleDescriptionSubmit = () => {
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLocalDescription(session?.description || '');
      setDescriptionError(null);
      setIsEditingDescription(false);
    }
  };

  // Handle manual retry
  const handleRetry = () => {
    const updates: { title?: string; description?: string } = {};
    
    if (localTitle !== session?.title) {
      updates.title = localTitle;
    }
    if (localDescription !== (session?.description || '')) {
      updates.description = localDescription;
    }
    
    if (Object.keys(updates).length > 0) {
      setAutoSaveState(prev => ({ ...prev, retryCount: 0 }));
      triggerAutoSave(updates);
    }
  };

  // Format auto-save indicator
  const getAutoSaveIndicator = () => {
    const { status, error, lastSaved } = autoSaveState;
    
    switch (status) {
      case 'saving':
        return { text: 'Saving...', className: 'text-blue-600' };
      case 'saved':
        const savedAgo = lastSaved ? Math.round((Date.now() - lastSaved) / 1000) : 0;
        return { 
          text: savedAgo < 10 ? 'Saved' : `Saved ${savedAgo}s ago`, 
          className: 'text-green-600' 
        };
      case 'error':
        return { text: 'Save failed', className: 'text-red-600' };
      default:
        return null;
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="session-workspace-loading">
        <div className="space-y-6">
          <div className="bg-muted rounded animate-pulse h-8 w-48" />
          <div className="bg-muted rounded animate-pulse h-12 w-full" />
          <div className="bg-muted rounded animate-pulse h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="session-not-found">
        <div className="text-center py-12">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2" data-testid="session-not-found-title">
            Session Not Found
          </h2>
          <p className="text-muted-foreground mb-6" data-testid="session-not-found-message">
            The session you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/dashboard">
              <Button variant="outline" data-testid="back-to-dashboard-button">
                Back to Dashboard
              </Button>
            </Link>
            <Button onClick={() => router.push('/dashboard')} data-testid="create-new-session-button">
              Create New Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const autoSaveIndicator = getAutoSaveIndicator();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="session-workspace">
      {/* Breadcrumb Navigation */}
      {showBreadcrumb && (
        <nav className="mb-6">
          <Link 
            href="/dashboard" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="back-to-dashboard"
          >
            ← Back to Dashboard
          </Link>
        </nav>
      )}

      {/* Session Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {/* Title Editing */}
            {isEditingTitle ? (
              <div className="space-y-2">
                <Input
                  ref={titleInputRef}
                  value={localTitle}
                  onChange={handleTitleChange}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleTitleKeyDown}
                  className={`text-2xl font-bold ${titleError ? 'border-destructive' : ''}`}
                  data-testid="session-title-input"
                  maxLength={200}
                />
                {titleError && (
                  <p className="text-sm text-destructive">{titleError}</p>
                )}
              </div>
            ) : (
              <h1 
                className="text-2xl font-bold text-foreground cursor-pointer hover:text-blue-600 transition-colors"
                onClick={handleTitleEdit}
                data-testid="session-title-editor"
                title="Click to edit title"
              >
                {localTitle || 'Untitled Session'}
              </h1>
            )}
          </div>
          
          {/* Session Metadata */}
          <div className="ml-4 text-right">
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Created {new Date(session.createdAt).toLocaleDateString()}</div>
              <div>Last accessed {new Date(session.lastAccessedAt).toLocaleString()}</div>
              {session.version && session.version > 1 && (
                <Badge variant="secondary" className="text-xs">
                  v{session.version}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description Editing */}
        <div className="mt-4">
          <Label htmlFor="description" className="text-sm font-medium mb-2 block">
            Description
          </Label>
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                ref={descriptionTextareaRef}
                value={localDescription}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionSubmit}
                onKeyDown={handleDescriptionKeyDown}
                placeholder="Add a description for this session..."
                className={`min-h-[100px] ${descriptionError ? 'border-destructive' : ''}`}
                data-testid="session-description-textarea"
                maxLength={2000}
              />
              {descriptionError && (
                <p className="text-sm text-destructive">{descriptionError}</p>
              )}
            </div>
          ) : (
            <div
              className="min-h-[100px] p-3 border rounded-md cursor-pointer hover:border-blue-300 transition-colors bg-background"
              onClick={handleDescriptionEdit}
              data-testid="session-description-editor"
              title="Click to edit description"
            >
              {localDescription ? (
                <p className="text-foreground whitespace-pre-wrap">{localDescription}</p>
              ) : (
                <p className="text-muted-foreground italic">Click to add a description...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auto-save Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background border rounded-lg px-3 py-2 shadow-lg">
        {autoSaveIndicator && (
          <span 
            className={`text-sm ${autoSaveIndicator.className}`}
            data-testid="auto-save-indicator"
          >
            {autoSaveIndicator.text}
          </span>
        )}
        
        {autoSaveState.status === 'error' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRetry}
            data-testid="auto-save-retry"
            title="Retry save"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        )}
      </div>

      {/* Session Content Area */}
      <div className="mt-8">
        <div className="border rounded-lg p-6 bg-muted/10">
          <p className="text-center text-muted-foreground">
            Session workspace content will be implemented in future phases.
          </p>
        </div>
      </div>
    </div>
  );
}