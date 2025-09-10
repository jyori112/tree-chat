/**
 * Validation Utility Types - Data Infrastructure
 * 
 * This file defines validation types, constants, and type guards for path validation,
 * error categorization, and security constraint enforcement in the data access layer.
 * 
 * @see Requirements: EDGE-1, EDGE-2, EDGE-3, SEC-2, SEC-4, USE-1, USE-2
 */

/**
 * Path validation constants based on DynamoDB and security constraints
 */
export const PATH_VALIDATION_CONSTANTS = {
  /** Maximum path length in bytes (DynamoDB limit minus workspace prefix overhead) */
  MAX_PATH_LENGTH_BYTES: 1000,
  /** Maximum path depth for traversal safety */
  MAX_PATH_DEPTH: 20,
  /** Reserved path prefixes that cannot be used by applications */
  RESERVED_PREFIXES: ['/system/', '/admin/', '/.', '/..'] as const,
  /** Pattern for valid path segments (alphanumeric, hyphens, underscores, no dots for security) */
  VALID_SEGMENT_PATTERN: /^[a-zA-Z0-9_-]+$/,
  /** Pattern for detecting path traversal attempts */
  PATH_TRAVERSAL_PATTERN: /(\.\.|\/\.\.\/|\/\.\.$|^\.\.|^\.\.\/)/,
} as const;

/**
 * Error categorization for validation failures.
 * Provides structured error codes for different types of validation issues.
 */
export enum ValidationErrorCode {
  // Path-related errors
  INVALID_PATH_FORMAT = 'INVALID_PATH_FORMAT',
  PATH_TOO_LONG = 'PATH_TOO_LONG', 
  PATH_TOO_DEEP = 'PATH_TOO_DEEP',
  INVALID_PATH_ENCODING = 'INVALID_PATH_ENCODING',
  
  // Security-related errors  
  PATH_TRAVERSAL_DETECTED = 'PATH_TRAVERSAL_DETECTED',
  WORKSPACE_BOUNDARY_VIOLATION = 'WORKSPACE_BOUNDARY_VIOLATION',
  RESERVED_PATH_PREFIX = 'RESERVED_PATH_PREFIX',
  
  // Value-related errors
  INVALID_VALUE_TYPE = 'INVALID_VALUE_TYPE',
  VALUE_TOO_LARGE = 'VALUE_TOO_LARGE',
  MALFORMED_JSON = 'MALFORMED_JSON',
  
  // Operation context errors
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_WORKSPACE_ID = 'INVALID_WORKSPACE_ID',
  INVALID_USER_ID = 'INVALID_USER_ID',
}

/**
 * Validation error severity levels for different types of issues
 */
export enum ValidationSeverity {
  /** Informational warnings that don't prevent operations */
  INFO = 'info',
  /** Warnings that may indicate potential issues */
  WARN = 'warn', 
  /** Errors that prevent operation execution */
  ERROR = 'error',
  /** Critical security violations that must be logged */
  CRITICAL = 'critical',
}

/**
 * Comprehensive validation error interface with security-conscious error reporting.
 * Error messages exclude sensitive information to prevent data leakage.
 */
export interface ValidationError extends Error {
  /** Structured error code for programmatic handling */
  code: ValidationErrorCode;
  /** Error severity level */
  severity: ValidationSeverity;
  /** Safe error message without sensitive information */
  message: string;
  /** Timestamp when validation error occurred (ISO string) */
  timestamp: string;
  /** Operation context for debugging (sanitized) */
  context?: {
    operation?: string;
    field?: string;
    pathLength?: number;
    depth?: number;
  };
  /** Additional technical details for debugging (internal use only) */
  internalDetails?: any;
}

/**
 * Path validation result with detailed feedback on validation status
 */
export interface PathValidationResult {
  /** Whether the path passes all validation checks */
  isValid: boolean;
  /** Error information if validation failed */
  error?: {
    code: ValidationErrorCode;
    message: string;
    severity: ValidationSeverity;
  };
  /** Normalized path after validation (if successful) */
  normalizedPath?: string;
  /** Path metadata for debugging */
  metadata?: {
    lengthBytes: number;
    depth: number;
    segments: string[];
    encoding: string;
  };
}

/**
 * Value validation result for data content validation
 */
export interface ValueValidationResult {
  /** Whether the value passes validation checks */
  isValid: boolean;
  /** Error information if validation failed */
  error?: {
    code: ValidationErrorCode;
    message: string;
    severity: ValidationSeverity;
  };
  /** Serialized size in bytes (if applicable) */
  sizeBytes?: number;
  /** Value type information */
  valueType?: 'null' | 'boolean' | 'number' | 'string' | 'object' | 'array';
}

/**
 * Security constraint types for workspace and path validation
 */
export interface SecurityConstraints {
  /** Workspace ID that operations must be scoped to */
  workspaceId: string;
  /** User ID for audit and authorization context */
  userId: string;
  /** Whether to enforce strict path validation (default: true) */
  strictMode?: boolean;
  /** Additional allowed path prefixes beyond standard ones */
  allowedPrefixes?: string[];
  /** Maximum operation depth for recursive operations */
  maxOperationDepth?: number;
}

/**
 * Path validation configuration options
 */
export interface PathValidationConfig {
  /** Maximum allowed path length in bytes */
  maxLengthBytes?: number;
  /** Maximum allowed path depth */
  maxDepth?: number;
  /** Whether to allow Unicode characters in paths */
  allowUnicode?: boolean;
  /** Whether to normalize path encoding */
  normalizeEncoding?: boolean;
  /** Custom validation patterns to apply */
  customPatterns?: {
    pattern: RegExp;
    errorMessage: string;
  }[];
}

/**
 * Type guard to check if a string is a valid hierarchical path.
 * Performs comprehensive validation including security checks.
 */
export type PathTypeGuard = (path: string, config?: PathValidationConfig) => path is ValidatedPath;

/**
 * Type guard to check if a value is suitable for storage.
 * Validates size, type, and serializability constraints.
 */
export type ValueTypeGuard = (value: any, maxSizeBytes?: number) => value is ValidatedValue;

/**
 * Type guard to check if security constraints are properly formed.
 * Validates workspace and user identifiers for security operations.
 */
export type SecurityConstraintsTypeGuard = (constraints: any) => constraints is SecurityConstraints;

/**
 * Branded type for validated paths to ensure compile-time safety.
 * Only paths that have passed validation can be used in data operations.
 */
export type ValidatedPath = string & { __validated: true };

/**
 * Branded type for validated values to ensure they meet storage constraints.
 * Only values that have passed validation can be stored.
 */
export type ValidatedValue = any & { __validated: true };

/**
 * Branded type for validated workspace identifiers.
 * Ensures workspace IDs have been properly validated before use.
 */
export type ValidatedWorkspaceId = string & { __workspaceValidated: true };

/**
 * Path normalization options for consistent path handling across operations.
 * Addresses Unicode encoding issues (EDGE-1) and case sensitivity (EDGE-3).
 */
export interface PathNormalizationOptions {
  /** Whether to normalize Unicode characters to NFC form */
  normalizeUnicode?: boolean;
  /** Whether to preserve case sensitivity (default: true for EDGE-3) */
  preserveCase?: boolean;
  /** Whether to collapse consecutive slashes */
  collapseSlashes?: boolean;
  /** Whether to remove trailing slashes */
  removeTrailingSlash?: boolean;
}

/**
 * Workspace boundary validation configuration.
 * Ensures operations cannot access data outside authorized workspaces (SEC-2).
 */
export interface WorkspaceBoundaryConfig {
  /** Workspace ID that defines the access boundary */
  workspaceId: ValidatedWorkspaceId;
  /** Whether to allow cross-workspace references (default: false) */
  allowCrossWorkspace?: boolean;
  /** Specific paths that are exempt from boundary checks */
  exemptPaths?: ValidatedPath[];
}

/**
 * Batch validation result for multiple path/value pairs.
 * Used when validating batch operations to provide comprehensive feedback.
 */
export interface BatchValidationResult {
  /** Whether all items in the batch are valid */
  isValid: boolean;
  /** Individual validation results for each item */
  itemResults: Array<{
    index: number;
    path?: string;
    pathValid: boolean;
    valueValid: boolean;
    errors: ValidationError[];
  }>;
  /** Overall batch errors (size limits, etc.) */
  batchErrors: ValidationError[];
  /** Total batch size in bytes */
  totalSizeBytes: number;
}

/**
 * Validation context for operations requiring workspace and user validation.
 * Provides complete context for security and audit requirements.
 */
export interface ValidationContext {
  /** Validated workspace identifier */
  workspaceId: ValidatedWorkspaceId;
  /** User identifier for audit purposes */
  userId: string;
  /** Operation being validated */
  operation: 'read' | 'write' | 'readTree' | 'batch';
  /** Timestamp of validation (ISO string) */
  timestamp: string;
  /** Additional security constraints */
  securityConstraints?: SecurityConstraints;
}

/**
 * Type for validation rule functions that can be composed.
 * Enables extensible validation logic for different use cases.
 */
export type ValidationRule<T> = (
  value: T, 
  context: ValidationContext
) => ValidationError | null;

/**
 * Composite validation result that combines multiple validation checks.
 * Used for complex validation scenarios requiring multiple rule applications.
 */
export interface CompositeValidationResult {
  /** Whether all validation rules passed */
  isValid: boolean;
  /** Individual results from each validation rule */
  ruleResults: Array<{
    ruleName: string;
    passed: boolean;
    error?: ValidationError;
  }>;
  /** Combined error message if validation failed */
  combinedError?: string;
}

/**
 * Validation metrics for monitoring and performance optimization.
 * Tracks validation performance and error patterns.
 */
export interface ValidationMetrics {
  /** Total validation operations performed */
  totalOperations: number;
  /** Number of validation failures */
  failureCount: number;
  /** Average validation time in milliseconds */
  averageValidationTimeMs: number;
  /** Distribution of error types */
  errorDistribution: Record<ValidationErrorCode, number>;
  /** Timestamp of last metric reset */
  lastResetTimestamp: string;
}