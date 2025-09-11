/**
 * Session Data Utilities
 * 
 * Reusable utilities for session data manipulation including sorting,
 * timestamp updates, and data path generation for the existing data hook
 * infrastructure. These utilities support the session management system.
 * 
 * @see Requirements: 3.1, 4.1 (session organization and data persistence)
 */

import { Session, SessionSortOption } from '@/types/session';

/**
 * Data path constants for session storage in the data store.
 */
export const SESSION_PATHS = {
  /** Base path for session list data */
  SESSIONS_LIST: '/sessions',
  /** Path template for individual session data */
  SESSION_DETAIL: (sessionId: string) => `/sessions/${sessionId}`,
  /** Path for session metadata */
  SESSION_META: (sessionId: string) => `/sessions/${sessionId}/meta`,
} as const;

/**
 * Sorts sessions by the specified sort option.
 * Default sort is by lastAccessedAt (most recently accessed first).
 * 
 * @param sessions - Array of sessions to sort
 * @param sortBy - Sort option (default: 'lastAccessedAt')
 * @returns Sorted array of sessions
 */
export function sortSessions(
  sessions: Session[],
  sortBy: SessionSortOption = 'lastAccessedAt'
): Session[] {
  const sortedSessions = [...sessions];

  switch (sortBy) {
    case 'lastAccessedAt':
      return sortedSessions.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    
    case 'createdAt':
      return sortedSessions.sort((a, b) => b.createdAt - a.createdAt);
    
    case 'updatedAt':
      return sortedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    
    case 'title':
      return sortedSessions.sort((a, b) => 
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    
    default:
      return sortedSessions.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  }
}

/**
 * Updates session timestamps for tracking access and modifications.
 * 
 * @param session - Session to update
 * @param updateType - Type of update ('access' | 'modify')
 * @returns Session with updated timestamps
 */
export function updateSessionTimestamps(
  session: Session,
  updateType: 'access' | 'modify' = 'access'
): Session {
  const now = Date.now();
  
  switch (updateType) {
    case 'access':
      return {
        ...session,
        lastAccessedAt: now
      };
    
    case 'modify':
      return {
        ...session,
        updatedAt: now,
        lastAccessedAt: now,
        version: (session.version || 0) + 1
      };
    
    default:
      return {
        ...session,
        lastAccessedAt: now
      };
  }
}

/**
 * Creates a new session object with generated metadata.
 * 
 * @param data - Session creation data
 * @param sessionId - Generated session ID
 * @param workspaceId - Current workspace ID
 * @param userId - Current user ID
 * @returns Complete session object with timestamps
 */
export function createSessionWithMetadata(
  data: { title: string; description?: string },
  sessionId: string,
  workspaceId: string,
  userId: string
): Session {
  const now = Date.now();
  
  return {
    id: sessionId,
    title: data.title,
    description: data.description,
    workspaceId,
    userId,
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    version: 1
  };
}

/**
 * Generates data paths for session operations with the data hook system.
 * 
 * @param operation - Type of operation ('list' | 'detail' | 'meta')
 * @param sessionId - Session ID (required for 'detail' and 'meta')
 * @returns Data path string for use with useRead/useWrite hooks
 */
export function getSessionDataPath(
  operation: 'list' | 'detail' | 'meta',
  sessionId?: string
): string {
  switch (operation) {
    case 'list':
      return SESSION_PATHS.SESSIONS_LIST;
    
    case 'detail':
      if (!sessionId) {
        throw new Error('sessionId is required for detail operation');
      }
      return SESSION_PATHS.SESSION_DETAIL(sessionId);
    
    case 'meta':
      if (!sessionId) {
        throw new Error('sessionId is required for meta operation');
      }
      return SESSION_PATHS.SESSION_META(sessionId);
    
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Filters sessions by search criteria (for future search functionality).
 * Currently supports title and description text search.
 * 
 * @param sessions - Array of sessions to filter
 * @param searchTerm - Search term to match against
 * @returns Filtered array of sessions
 */
export function filterSessions(
  sessions: Session[],
  searchTerm: string
): Session[] {
  if (!searchTerm.trim()) {
    return sessions;
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return sessions.filter(session => {
    const titleMatch = session.title.toLowerCase().includes(normalizedSearch);
    const descriptionMatch = session.description?.toLowerCase().includes(normalizedSearch) || false;
    
    return titleMatch || descriptionMatch;
  });
}

/**
 * Calculates session statistics for dashboard display.
 * 
 * @param sessions - Array of sessions
 * @returns Session statistics object
 */
export function getSessionStats(sessions: Session[]): {
  total: number;
  recentlyAccessed: number; // Within last 7 days
  recentlyCreated: number;  // Within last 24 hours
  oldestSession: Session | null;
  newestSession: Session | null;
} {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const recentlyAccessed = sessions.filter(
    session => (now - session.lastAccessedAt) <= sevenDaysMs
  ).length;

  const recentlyCreated = sessions.filter(
    session => (now - session.createdAt) <= oneDayMs
  ).length;

  const sortedByCreation = sortSessions(sessions, 'createdAt');
  const oldestSession = sortedByCreation.length > 0 
    ? sortedByCreation[sortedByCreation.length - 1] 
    : null;
  const newestSession = sortedByCreation.length > 0 
    ? sortedByCreation[0] 
    : null;

  return {
    total: sessions.length,
    recentlyAccessed,
    recentlyCreated,
    oldestSession,
    newestSession
  };
}

/**
 * Validates session data integrity and returns any issues found.
 * 
 * @param session - Session to validate
 * @returns Array of validation issues (empty if valid)
 */
export function validateSessionIntegrity(session: Session): string[] {
  const issues: string[] = [];

  // Check timestamp logic
  if (session.updatedAt < session.createdAt) {
    issues.push('Updated timestamp is before creation timestamp');
  }

  if (session.lastAccessedAt < session.createdAt) {
    issues.push('Last accessed timestamp is before creation timestamp');
  }

  // Check required fields
  if (!session.id || session.id.trim().length === 0) {
    issues.push('Session ID is empty');
  }

  if (!session.title || session.title.trim().length === 0) {
    issues.push('Session title is empty');
  }

  if (!session.workspaceId || session.workspaceId.trim().length === 0) {
    issues.push('Workspace ID is empty');
  }

  if (!session.userId || session.userId.trim().length === 0) {
    issues.push('User ID is empty');
  }

  // Check timestamp values are valid
  if (session.createdAt <= 0 || session.updatedAt <= 0 || session.lastAccessedAt <= 0) {
    issues.push('Invalid timestamp values detected');
  }

  return issues;
}

/**
 * Merges session updates with existing session data.
 * Handles partial updates and timestamp management.
 * 
 * @param existingSession - Current session data
 * @param updates - Partial session updates
 * @returns Updated session object
 */
export function mergeSessionUpdates(
  existingSession: Session,
  updates: Partial<Pick<Session, 'title' | 'description'>>
): Session {
  const updatedSession: Session = {
    ...existingSession,
    ...updates,
  };

  // Auto-update timestamps for any content changes
  if (updates.title !== undefined || updates.description !== undefined) {
    return updateSessionTimestamps(updatedSession, 'modify');
  }

  return updatedSession;
}

/**
 * Prepares session data for storage by ensuring all required fields are present
 * and properly formatted.
 * 
 * @param session - Session to prepare
 * @returns Session ready for storage
 */
export function prepareSessionForStorage(session: Session): Session {
  // Ensure all required fields are present and properly formatted
  return {
    id: session.id.trim(),
    title: session.title.trim(),
    description: session.description?.trim() || undefined,
    workspaceId: session.workspaceId.trim(),
    userId: session.userId.trim(),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastAccessedAt: session.lastAccessedAt,
    version: session.version || 1
  };
}

/**
 * Creates batch operations for atomic session updates.
 * Useful for maintaining data consistency when updating both session data and lists.
 * 
 * @param sessionId - Session ID to update
 * @param sessionData - Updated session data
 * @param sessionsList - Current sessions list
 * @returns Batch operations array for useBatch hook
 */
export function createSessionBatchOperations(
  sessionId: string,
  sessionData: Session,
  sessionsList: Session[]
): Array<{ path: string; value: any }> {
  // Update individual session
  const sessionUpdate = {
    path: getSessionDataPath('detail', sessionId),
    value: prepareSessionForStorage(sessionData)
  };

  // Update sessions list
  const updatedList = sessionsList.map(session => 
    session.id === sessionId ? sessionData : session
  );
  const listUpdate = {
    path: getSessionDataPath('list'),
    value: updatedList
  };

  return [sessionUpdate, listUpdate];
}