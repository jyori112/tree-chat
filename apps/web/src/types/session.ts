/**
 * Session Management Types
 * 
 * TypeScript interfaces for session data structures, workspace isolation,
 * and session operations. These types ensure type safety across all session
 * management features and integrate with existing SessionContext types.
 * 
 * @see Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.3, 4.1-4.6
 */

/**
 * Core session data model representing a thinking session workspace.
 * Sessions are isolated by workspace and include metadata for sorting and tracking.
 */
export interface Session {
  /** Unique session identifier (UUID) */
  id: string;
  /** User-provided session title (required, max 200 characters) */
  title: string;
  /** Optional session description */
  description?: string;
  /** Workspace identifier from Clerk organization for isolation */
  workspaceId: string;
  /** User identifier from Clerk for ownership */
  userId: string;
  /** Session creation timestamp (Unix timestamp in milliseconds) */
  createdAt: number;
  /** Last modification timestamp (Unix timestamp in milliseconds) - updated on auto-save */
  updatedAt: number;
  /** Last access timestamp (Unix timestamp in milliseconds) - updated on session access */
  lastAccessedAt: number;
  /** Optional version number for conflict resolution */
  version?: number;
}

/**
 * Data structure for creating new sessions.
 * Used in CreateSessionModal and session creation API calls.
 */
export interface CreateSessionData {
  /** Session title (required) */
  title: string;
  /** Optional session description */
  description?: string;
}

/**
 * Response format for session list operations.
 * Supports future pagination and includes metadata about the query results.
 */
export interface SessionListResponse {
  /** Array of sessions for the current workspace, sorted by lastAccessedAt (desc) */
  sessions: Session[];
  /** Whether more sessions exist (for future pagination support) */
  hasMore: boolean;
  /** DynamoDB pagination key for next page (optional) */
  lastKey?: string;
  /** Total count of sessions in workspace (optional) */
  totalCount?: number;
}

/**
 * Data structure for session updates during editing.
 * Used for auto-save operations with optimistic updates.
 */
export interface SessionUpdateData {
  /** Updated session title */
  title?: string;
  /** Updated session description */
  description?: string;
  /** Updated timestamp (set automatically) */
  updatedAt?: number;
  /** Version for conflict resolution (optional) */
  version?: number;
}

/**
 * Session validation error types for form handling and API responses.
 */
export interface SessionValidationError {
  /** Field that failed validation */
  field: 'title' | 'description' | 'general';
  /** Error message for display to user */
  message: string;
  /** Error code for programmatic handling */
  code: 'REQUIRED' | 'TOO_LONG' | 'INVALID_CHARACTERS' | 'DUPLICATE' | 'WORKSPACE_MISMATCH';
}

/**
 * Session operation result for API responses and error handling.
 */
export interface SessionOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** The session data (for successful operations) */
  session?: Session;
  /** Validation or operation errors */
  error?: SessionValidationError;
  /** Additional metadata about the operation */
  metadata?: {
    /** Operation timestamp */
    timestamp: number;
    /** Operation type */
    operation: 'create' | 'update' | 'delete' | 'access';
    /** Auto-save vs manual save */
    trigger?: 'auto' | 'manual';
  };
}

/**
 * Session sorting options for list display.
 */
export type SessionSortOption = 
  | 'lastAccessedAt'  // Most recently accessed (default)
  | 'createdAt'       // Most recently created
  | 'updatedAt'       // Most recently modified
  | 'title';          // Alphabetical by title

/**
 * Session list state for component management.
 */
export interface SessionListState {
  /** Array of sessions */
  sessions: Session[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Current sort option */
  sortBy: SessionSortOption;
  /** Whether data is being refreshed */
  refreshing: boolean;
}

/**
 * Auto-save state for session editing components.
 */
export interface AutoSaveState {
  /** Current save status */
  status: 'idle' | 'saving' | 'saved' | 'error';
  /** Error message if save failed */
  error?: string;
  /** Last successful save timestamp */
  lastSaved?: number;
  /** Number of retry attempts for failed saves */
  retryCount?: number;
  /** Whether auto-save is enabled */
  enabled: boolean;
}

/**
 * Session workspace state for the workspace component.
 */
export interface SessionWorkspaceState {
  /** Current session data */
  session: Session | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Whether session is being updated */
  updating: boolean;
  /** Auto-save state */
  autoSave: AutoSaveState;
  /** Edit mode states */
  editMode: {
    title: boolean;
    description: boolean;
  };
}

/**
 * Offline queue item for handling network disconnections.
 */
export interface OfflineQueueItem {
  /** Unique identifier for the queued operation */
  id: string;
  /** Session ID being modified */
  sessionId: string;
  /** Type of operation */
  operation: 'create' | 'update' | 'delete';
  /** Data for the operation */
  data: CreateSessionData | SessionUpdateData | null;
  /** Timestamp when operation was queued */
  queuedAt: number;
  /** Number of retry attempts */
  attempts: number;
}

/**
 * Session management hook state combining list and workspace functionality.
 */
export interface SessionManagementState {
  /** Session list state */
  list: SessionListState;
  /** Current workspace state */
  workspace: SessionWorkspaceState;
  /** Offline queue state */
  offline: {
    /** Whether currently offline */
    isOffline: boolean;
    /** Queued operations */
    queue: OfflineQueueItem[];
    /** Whether sync is in progress */
    syncing: boolean;
  };
}

/**
 * Type guard to check if an object is a valid Session.
 * Useful for runtime validation and type narrowing.
 */
export const isSession = (obj: any): obj is Session => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.workspaceId === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number' &&
    typeof obj.lastAccessedAt === 'number'
  );
};

/**
 * Type guard to check if an object is valid CreateSessionData.
 */
export const isCreateSessionData = (obj: any): obj is CreateSessionData => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.title === 'string' &&
    obj.title.length > 0 &&
    (obj.description === undefined || typeof obj.description === 'string')
  );
};

/**
 * Utility type for partial session updates (omitting read-only fields).
 */
export type SessionUpdatableFields = Pick<Session, 'title' | 'description'>;

/**
 * Utility type for session metadata fields (timestamps, IDs).
 */
export type SessionMetadata = Pick<Session, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'version'>;

/**
 * Utility type for creating new sessions with generated metadata.
 */
export type SessionCreationData = CreateSessionData & {
  workspaceId: string;
  userId: string;
};