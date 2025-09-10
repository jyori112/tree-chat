/**
 * Session Context Types - Authentication & Authorization
 * 
 * This file defines session context interfaces for workspace-based authentication
 * and authorization with expiration handling and validation utilities.
 * 
 * @see Requirements: REQ-5 - Generic Authentication Context Integration
 */

/**
 * Core session context containing validated authentication and workspace information.
 * Used by data operations to validate workspace access without knowledge of specific roles.
 */
export interface SessionContext {
  /** Authenticated user identifier from Clerk */
  userId: string;
  /** Validated workspace identifier from Clerk organization */
  workspaceId: string;
  /** Context expiration timestamp (Unix timestamp in milliseconds) */
  expiresAt: number;
  /** Context creation timestamp (Unix timestamp in milliseconds) */
  createdAt: number;
  /** Optional user metadata for audit purposes */
  userMetadata?: {
    email?: string;
    name?: string;
    role?: string;
  };
}

/**
 * Authentication error types for session context operations.
 * Provides structured error handling for authentication failures.
 */
export interface AuthenticationError extends Error {
  /** Specific error code for programmatic handling */
  code: 'SESSION_EXPIRED' | 'INVALID_SESSION' | 'WORKSPACE_ACCESS_DENIED' | 
        'MALFORMED_CONTEXT' | 'MISSING_REQUIRED_FIELDS' | 'UNAUTHORIZED';
  /** Human-readable error message */
  message: string;
  /** Timestamp when the error occurred (Unix timestamp in milliseconds) */
  timestamp: number;
  /** Session context that caused the error, if available */
  context?: Partial<SessionContext>;
  /** Additional error details for debugging */
  details?: any;
}

/**
 * Result type for session context validation operations.
 * Provides detailed feedback on validation success or failure.
 */
export interface SessionValidationResult {
  /** Whether the session context is valid */
  isValid: boolean;
  /** Error information if validation failed */
  error?: {
    code: AuthenticationError['code'];
    message: string;
    field?: keyof SessionContext;
  };
  /** Remaining time until expiration in milliseconds (if valid) */
  remainingTtl?: number;
}

/**
 * Configuration options for session context validation and handling.
 */
export interface SessionContextConfig {
  /** Grace period in milliseconds before expiration for early refresh warnings */
  expirationGracePeriodMs?: number;
  /** Whether to allow expired sessions (for debugging purposes) */
  allowExpiredSessions?: boolean;
  /** Custom validation function for additional checks */
  customValidator?: (context: SessionContext) => boolean;
}

/**
 * Utility type to extract the workspace ID from a session context.
 * Useful for type-safe workspace identification.
 */
export type WorkspaceId = SessionContext['workspaceId'];

/**
 * Utility type to extract the user ID from a session context.
 * Useful for type-safe user identification.
 */
export type UserId = SessionContext['userId'];

/**
 * Type guard to check if an object is a valid SessionContext.
 * Performs runtime validation of required fields.
 */
export type SessionContextTypeGuard = (obj: any) => obj is SessionContext;

/**
 * Utility type for creating partial session contexts during testing or development.
 * All fields except userId and workspaceId are optional.
 */
export type PartialSessionContext = Pick<SessionContext, 'userId' | 'workspaceId'> & 
  Partial<Omit<SessionContext, 'userId' | 'workspaceId'>>;

/**
 * Utility type for session context with mandatory expiration.
 * Ensures expiration timestamp is always present for security-critical operations.
 */
export type SecureSessionContext = SessionContext & Required<Pick<SessionContext, 'expiresAt' | 'createdAt'>>;

/**
 * Type representing the minimum required fields for workspace validation.
 * Used when only workspace access validation is needed.
 */
export type WorkspaceValidationContext = Pick<SessionContext, 'workspaceId' | 'userId' | 'expiresAt'>;

/**
 * Session context creation options for generating new contexts.
 * Provides sensible defaults for expiration timing.
 */
export interface CreateSessionContextOptions {
  /** User identifier from authentication provider */
  userId: string;
  /** Workspace identifier from organization system */
  workspaceId: string;
  /** Session lifetime in milliseconds (default: 24 hours) */
  sessionLifetimeMs?: number;
  /** Optional user metadata */
  userMetadata?: SessionContext['userMetadata'];
}

/**
 * Validation helper types for ensuring workspace path consistency.
 * Used to validate that data paths match the authenticated workspace.
 */
export type WorkspacePathValidator = (workspaceId: WorkspaceId, path: string) => boolean;

/**
 * Session refresh result for extending session lifetime.
 * Used when implementing session renewal logic.
 */
export interface SessionRefreshResult {
  /** Whether the refresh was successful */
  success: boolean;
  /** New session context with updated expiration (if successful) */
  newContext?: SessionContext;
  /** Error information if refresh failed */
  error?: AuthenticationError;
}

/**
 * Utility type for session context validation rules.
 * Allows custom validation logic to be applied consistently.
 */
export interface SessionValidationRules {
  /** Minimum remaining session time in milliseconds to consider valid */
  minRemainingTimeMs?: number;
  /** Whether to validate user metadata presence */
  requireUserMetadata?: boolean;
  /** Custom validation functions */
  customRules?: Array<(context: SessionContext) => SessionValidationResult>;
}

/**
 * Type for workspace access permissions extracted from session context.
 * Used for fine-grained access control without exposing full session details.
 */
export interface WorkspaceAccessContext {
  /** Workspace identifier */
  workspaceId: WorkspaceId;
  /** User identifier */
  userId: UserId;
  /** Whether the context is still valid (not expired) */
  isValid: boolean;
  /** Session expiration timestamp */
  expiresAt: number;
}