/**
 * Shared package exports
 * 
 * Central export point for all shared types, utilities, and constants
 * used across the tree-chat monorepo.
 */

// Data Access Types
export * from './types/data-access';

// Session Context Types
export * from './types/session-context';

// Validation Types
export * from './types/validation';

// Re-export commonly used interfaces for convenience
export type {
  DataClient,
  DataResponse,
  TreeResponse,
  BatchOperation,
  DataClientConfig,
  DataAccessError,
  ValidationResult,
  AuditLog
} from './types/data-access';

export type {
  SessionContext,
  AuthenticationError,
  SessionValidationResult,
  WorkspaceId,
  UserId,
  SecureSessionContext,
  WorkspaceValidationContext,
  WorkspaceAccessContext
} from './types/session-context';

export type {
  ValidationError,
  PathValidationResult,
  ValueValidationResult,
  SecurityConstraints,
  ValidatedPath,
  ValidatedValue,
  ValidatedWorkspaceId,
  PathValidationConfig,
  ValidationContext,
  BatchValidationResult
} from './types/validation';

// Export enums as values, not types
export {
  ValidationErrorCode,
  ValidationSeverity
} from './types/validation';