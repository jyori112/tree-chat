/**
 * SessionCard Component
 * 
 * Individual session display component with navigation and basic actions.
 * Displays session metadata and provides click-to-navigate and delete functionality.
 * 
 * @see Requirements: 1.5, 3.3 (session display and management)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Session } from '@/types/session';
import { useWritePath, useBatch } from '@/hooks/data';
import { 
  updateSessionTimestamps, 
  getSessionDataPath,
  createSessionBatchOperations 
} from '@/utils/session-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SessionCardProps {
  /** Session data to display */
  session: Session;
  /** Current sessions list for batch updates */
  sessionsList: Session[];
  /** Callback when session is updated (for optimistic updates) */
  onSessionUpdate?: (updatedSession: Session) => void;
  /** Callback when session is deleted */
  onSessionDelete?: (deletedSessionId: string) => void;
  /** Whether the card should show a compact view */
  compact?: boolean;
}

/**
 * Individual session card component with navigation and delete functionality.
 */
export function SessionCard({ 
  session, 
  sessionsList, 
  onSessionUpdate, 
  onSessionDelete, 
  compact = false 
}: SessionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Data hooks for session operations
  const { write: updateSession } = useWritePath(getSessionDataPath('detail', session.id));
  const { executeBatch } = useBatch();

  // Format timestamps for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Handle session access tracking
  const handleSessionClick = async () => {
    try {
      // Update last accessed timestamp
      const updatedSession = updateSessionTimestamps(session, 'access');
      
      // Optimistic update
      onSessionUpdate?.(updatedSession);
      
      // Update in data store
      await updateSession(updatedSession);
    } catch (error) {
      console.error('Failed to update session access time:', error);
      // Note: Navigation will still proceed even if access tracking fails
    }
  };

  // Handle session deletion with confirmation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    
    try {
      // Create batch operations for atomic deletion
      const operations = [
        {
          path: getSessionDataPath('detail', session.id),
          value: null // Deletion
        },
        {
          path: getSessionDataPath('list'),
          value: sessionsList.filter(s => s.id !== session.id)
        }
      ];
      
      // Optimistic update
      onSessionDelete?.(session.id);
      
      // Execute batch deletion
      await executeBatch(operations);
      
    } catch (error) {
      console.error('Failed to delete session:', error);
      // TODO: Show error toast and revert optimistic update
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Card 
        className={`relative transition-all duration-200 hover:shadow-md ${compact ? 'p-2' : 'p-4'}`}
        data-testid="session-card"
        data-session-title={session.title}
        data-session-id={session.id}
      >
        <Link 
          href={`/sessions/${session.id}`}
          onClick={handleSessionClick}
          className="block w-full h-full"
        >
          <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 
                  className={`font-semibold text-foreground truncate ${compact ? 'text-sm' : 'text-base'}`}
                  title={session.title}
                >
                  {session.title}
                </h3>
                {session.description && !compact && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {session.description}
                  </p>
                )}
              </div>
              
              {/* Delete button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
                data-testid="session-delete-button"
                title="Delete session"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className={compact ? 'pt-0' : 'pt-0'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created {formatDate(session.createdAt)}</span>
                <span>•</span>
                <span>Accessed {formatDate(session.lastAccessedAt)}</span>
              </div>
              
              {session.version && session.version > 1 && (
                <Badge variant="secondary" className="text-xs">
                  v{session.version}
                </Badge>
              )}
            </div>
            
            {!compact && session.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {session.description}
              </p>
            )}
          </CardContent>
        </Link>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          data-testid="delete-confirmation-dialog"
        >
          <div className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Session</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete "{session.title}"? This action cannot be undone.
            </p>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                data-testid="delete-confirmation-cancel"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                data-testid="delete-confirmation-confirm"
              >
                {isDeleting ? 'Deleting...' : 'Delete Session'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Session card skeleton for loading states.
 */
export function SessionCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={`${compact ? 'p-2' : 'p-4'}`} data-testid="session-card-skeleton">
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className={`bg-muted rounded animate-pulse ${compact ? 'h-4' : 'h-5'} w-3/4`} />
            {!compact && (
              <div className="bg-muted rounded animate-pulse h-4 w-1/2 mt-2" />
            )}
          </div>
          <div className="bg-muted rounded animate-pulse h-8 w-8 ml-2" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="bg-muted rounded animate-pulse h-3 w-1/2" />
          <div className="bg-muted rounded animate-pulse h-5 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}