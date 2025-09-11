/**
 * SessionList Component
 * 
 * Main session management interface displaying sessions sorted by last accessed.
 * Integrates with the data hook infrastructure for session fetching and management.
 * 
 * @see Requirements: 1.1, 1.5, 3.1 (session listing, display, and organization)
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Session, SessionSortOption } from '@/types/session';
import { useRead, useReadWithDefault } from '@/hooks/data';
import { 
  sortSessions, 
  getSessionDataPath,
  getSessionStats 
} from '@/utils/session-utils';
import { SessionCard, SessionCardSkeleton } from './SessionCard';
import { CreateSessionModal, useCreateSessionModal } from './CreateSessionModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SessionListProps {
  /** Custom sort option (default: 'lastAccessedAt') */
  sortBy?: SessionSortOption;
  /** Whether to show compact view */
  compact?: boolean;
  /** Maximum number of sessions to display (default: unlimited) */
  limit?: number;
  /** Callback when a session is selected */
  onSessionSelect?: (session: Session) => void;
  /** Whether to show the create button */
  showCreateButton?: boolean;
}

/**
 * Main session list component with data integration and management functionality.
 */
export function SessionList({
  sortBy = 'lastAccessedAt',
  compact = false,
  limit,
  onSessionSelect,
  showCreateButton = true
}: SessionListProps) {
  const { userId, orgId } = useAuth();
  const [optimisticSessions, setOptimisticSessions] = useState<Session[]>([]);
  const [deletedSessions, setDeletedSessions] = useState<Set<string>>(new Set());

  // Data hooks for session management
  const { 
    data: sessions, 
    loading, 
    error, 
    refresh 
  } = useReadWithDefault<Session[]>(getSessionDataPath('list'), { 
    defaultValue: [],
    immediate: true,
    cache: true,
    cacheDuration: 30000 // 30 seconds cache
  });

  // Create session modal management
  const createSessionModal = useCreateSessionModal(sessions || []);

  // Process sessions with optimistic updates and filtering
  const processedSessions = useMemo(() => {
    if (!sessions) return [];
    
    // Merge with optimistic additions
    const allSessions = [...sessions, ...optimisticSessions];
    
    // Filter out deleted sessions
    const filteredSessions = allSessions.filter(
      session => !deletedSessions.has(session.id)
    );
    
    // Remove duplicates (prefer optimistic versions)
    const uniqueSessions = filteredSessions.reduce((acc, session) => {
      const existingIndex = acc.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        // Replace with newer version (optimistic updates take precedence)
        acc[existingIndex] = session;
      } else {
        acc.push(session);
      }
      return acc;
    }, [] as Session[]);
    
    // Sort sessions
    const sortedSessions = sortSessions(uniqueSessions, sortBy);
    
    // Apply limit if specified
    return limit ? sortedSessions.slice(0, limit) : sortedSessions;
  }, [sessions, optimisticSessions, deletedSessions, sortBy, limit]);

  // Session statistics
  const sessionStats = useMemo(() => {
    return getSessionStats(processedSessions);
  }, [processedSessions]);

  // Handle optimistic session creation
  const handleSessionCreated = useCallback((newSession: Session) => {
    setOptimisticSessions(prev => [newSession, ...prev]);
    onSessionSelect?.(newSession);
  }, [onSessionSelect]);

  // Handle optimistic session updates
  const handleSessionUpdate = useCallback((updatedSession: Session) => {
    setOptimisticSessions(prev => {
      const existingIndex = prev.findIndex(s => s.id === updatedSession.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = updatedSession;
        return updated;
      }
      return prev;
    });
  }, []);

  // Handle optimistic session deletion
  const handleSessionDelete = useCallback((deletedSessionId: string) => {
    setDeletedSessions(prev => new Set(prev).add(deletedSessionId));
  }, []);

  // Handle create session click
  const handleCreateSession = () => {
    createSessionModal.open();
  };

  // Handle retry on error
  const handleRetry = () => {
    setOptimisticSessions([]);
    setDeletedSessions(new Set());
    refresh();
  };

  // Show loading state
  if (loading && processedSessions.length === 0) {
    return (
      <div className="space-y-4" data-testid="session-list-loading">
        <div className="flex items-center justify-between">
          <div className="bg-muted rounded animate-pulse h-6 w-32" />
          {showCreateButton && (
            <div className="bg-muted rounded animate-pulse h-9 w-32" />
          )}
        </div>
        
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SessionCardSkeleton key={index} compact={compact} />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error && processedSessions.length === 0) {
    return (
      <div 
        className="text-center py-12"
        data-testid="session-list-error"
      >
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Failed to Load Sessions
        </h3>
        <p className="text-muted-foreground mb-6">
          {error}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleRetry} variant="outline">
            Try Again
          </Button>
          {showCreateButton && (
            <Button onClick={handleCreateSession}>
              Create New Session
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show empty state
  if (processedSessions.length === 0) {
    return (
      <div 
        className="text-center py-12"
        data-testid="session-list-empty"
      >
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Sessions Yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Create your first thinking session to get started with organized problem solving.
        </p>
        {showCreateButton && (
          <Button 
            onClick={handleCreateSession}
            data-testid="create-first-session-button"
          >
            Create Your First Session
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="session-list">
      {/* Header with stats and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Your Sessions
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {sessionStats.total} total
            </Badge>
            {sessionStats.recentlyAccessed > 0 && (
              <Badge variant="outline">
                {sessionStats.recentlyAccessed} recent
              </Badge>
            )}
          </div>
        </div>
        
        {showCreateButton && (
          <Button 
            onClick={handleCreateSession}
            data-testid="create-session-button"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </Button>
        )}
      </div>

      {/* Sessions grid */}
      <div className="grid gap-4">
        {processedSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            sessionsList={sessions || []}
            onSessionUpdate={handleSessionUpdate}
            onSessionDelete={handleSessionDelete}
            compact={compact}
          />
        ))}
      </div>

      {/* Load more hint (for future pagination) */}
      {limit && processedSessions.length >= limit && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Showing {limit} of {sessionStats.total} sessions
        </div>
      )}

      {/* Loading indicator for optimistic updates */}
      {(loading && processedSessions.length > 0) && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing...
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      <createSessionModal.CreateSessionModal
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}

/**
 * Compact session list variant for dashboard widgets
 */
export function SessionListCompact(props: Omit<SessionListProps, 'compact'>) {
  return (
    <SessionList 
      {...props} 
      compact={true}
      limit={props.limit || 5}
      showCreateButton={false}
    />
  );
}

/**
 * Hook for managing session list state and operations
 */
export function useSessionList() {
  const { 
    data: sessions, 
    loading, 
    error, 
    refresh 
  } = useReadWithDefault<Session[]>(getSessionDataPath('list'), { 
    defaultValue: [],
    immediate: true,
    cache: true 
  });

  const stats = useMemo(() => {
    return getSessionStats(sessions || []);
  }, [sessions]);

  return {
    sessions: sessions || [],
    loading,
    error,
    refresh,
    stats
  };
}