/**
 * Workspace Validation Utilities - Data Infrastructure
 * 
 * This module provides comprehensive workspace validation utilities that enforce
 * workspace boundary constraints, validate authentication context, and provide
 * security logging for unauthorized access attempts.
 * 
 * @see Requirements: REQ-2, REQ-5, SEC-2, SEC-4
 */

import {
  SessionContext,
  WorkspaceId,
  UserId,
  AuthenticationError,
  SessionValidationResult,
  WorkspaceValidationContext,
  WorkspaceAccessContext,
  ValidationErrorCode,
  ValidationSeverity,
  ValidationError,
  ValidatedPath,
  ValidatedWorkspaceId,
  SecurityConstraints,
} from '@tree-chat/shared';

import { validatePath, validateWorkspaceBoundary } from './validation.js';

/**
 * Validation result specifically for workspace operations
 */
export interface WorkspaceValidationResult {
  /** Whether the workspace validation passed */
  isValid: boolean;
  /** Error information if validation failed */
  error?: {
    code: ValidationErrorCode | AuthenticationError['code'];
    message: string;
    severity: ValidationSeverity;
    field?: string;
  };
  /** Validated workspace context if successful */
  validatedContext?: WorkspaceAccessContext;
  /** Security audit information */
  auditInfo?: {
    timestamp: string;
    operation: string;
    workspaceId?: string | undefined;
    userId?: string | undefined;
    pathRequested?: string | undefined;
    denialReason?: string | undefined;
  };
}

/**
 * Configuration for workspace validation behavior
 */
export interface WorkspaceValidatorConfig {
  /** Enable security audit logging for access attempts */
  enableSecurityLogging?: boolean;
  /** Custom validation rules for workspace boundaries */
  customBoundaryRules?: Array<(workspaceId: string, path: string) => boolean>;
  /** Grace period for session expiration in milliseconds */
  sessionGracePeriodMs?: number;
  /** Whether to allow cross-workspace paths for system operations */
  allowSystemCrossWorkspace?: boolean;
}

/**
 * Security logging interface for workspace access attempts
 */
export interface WorkspaceSecurityLog {
  /** Timestamp of the access attempt (ISO string) */
  timestamp: string;
  /** Type of security event */
  eventType: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'BOUNDARY_VIOLATION' | 'SESSION_EXPIRED' | 'INVALID_WORKSPACE';
  /** User ID from session context */
  userId?: string;
  /** Workspace ID from session context */
  workspaceId?: string;
  /** Path that was requested */
  requestedPath?: string;
  /** Reason for denial (if access was denied) */
  denialReason?: string;
  /** Additional context for security analysis */
  context?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    operation?: string;
  };
  /** Severity level for the security event */
  severity: ValidationSeverity;
}

/**
 * Global security logger instance for workspace access events
 */
class WorkspaceSecurityLogger {
  private logs: WorkspaceSecurityLog[] = [];
  private maxLogSize = 10000; // Prevent memory leaks in long-running processes

  /**
   * Log a workspace security event
   */
  logSecurityEvent(event: Omit<WorkspaceSecurityLog, 'timestamp'>): void {
    const logEntry: WorkspaceSecurityLog = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to internal log array
    this.logs.push(logEntry);

    // Trim logs if they exceed max size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize / 2);
    }

    // Log to console for development/debugging
    if (event.severity === ValidationSeverity.CRITICAL || event.severity === ValidationSeverity.ERROR) {
      console.error('[WORKSPACE_SECURITY]', logEntry);
    } else if (event.severity === ValidationSeverity.WARN) {
      console.warn('[WORKSPACE_SECURITY]', logEntry);
    } else {
      console.log('[WORKSPACE_SECURITY]', logEntry);
    }

    // In production, this would integrate with proper logging systems
    // TODO: Integrate with structured logging system (CloudWatch, DataDog, etc.)
  }

  /**
   * Get recent security logs for monitoring purposes
   */
  getRecentLogs(count: number = 100): WorkspaceSecurityLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs filtered by event type and time range
   */
  getFilteredLogs(
    eventType?: WorkspaceSecurityLog['eventType'],
    sinceTimestamp?: string
  ): WorkspaceSecurityLog[] {
    let filtered = this.logs;

    if (eventType) {
      filtered = filtered.filter(log => log.eventType === eventType);
    }

    if (sinceTimestamp) {
      filtered = filtered.filter(log => log.timestamp >= sinceTimestamp);
    }

    return filtered;
  }
}

// Global logger instance
const securityLogger = new WorkspaceSecurityLogger();

/**
 * Validates a workspace ID format and structure.
 * Ensures workspace IDs conform to expected patterns and security constraints.
 * 
 * @param workspaceId - The workspace ID to validate
 * @returns Validation result with detailed error information
 */
export function validateWorkspaceId(workspaceId: string): WorkspaceValidationResult {
  const timestamp = new Date().toISOString();

  // Basic format validation
  if (!workspaceId || typeof workspaceId !== 'string') {
    return {
      isValid: false,
      error: {
        code: ValidationErrorCode.INVALID_WORKSPACE_ID,
        message: 'Workspace ID must be a non-empty string',
        severity: ValidationSeverity.ERROR,
        field: 'workspaceId',
      },
      auditInfo: {
        timestamp,
        operation: 'validateWorkspaceId',
        denialReason: 'Invalid workspace ID format',
      },
    };
  }

  // Length validation (reasonable bounds)
  if (workspaceId.length < 3 || workspaceId.length > 100) {
    return {
      isValid: false,
      error: {
        code: ValidationErrorCode.INVALID_WORKSPACE_ID,
        message: 'Workspace ID length must be between 3 and 100 characters',
        severity: ValidationSeverity.ERROR,
        field: 'workspaceId',
      },
      auditInfo: {
        timestamp,
        operation: 'validateWorkspaceId',
        workspaceId,
        denialReason: 'Workspace ID length out of bounds',
      },
    };
  }

  // Pattern validation (alphanumeric with hyphens and underscores)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(workspaceId)) {
    return {
      isValid: false,
      error: {
        code: ValidationErrorCode.INVALID_WORKSPACE_ID,
        message: 'Workspace ID contains invalid characters',
        severity: ValidationSeverity.ERROR,
        field: 'workspaceId',
      },
      auditInfo: {
        timestamp,
        operation: 'validateWorkspaceId',
        workspaceId,
        denialReason: 'Invalid characters in workspace ID',
      },
    };
  }

  // Reserved workspace ID validation
  const reservedIds = ['system', 'admin', 'root', 'test', 'default'];
  if (reservedIds.includes(workspaceId.toLowerCase())) {
    return {
      isValid: false,
      error: {
        code: ValidationErrorCode.INVALID_WORKSPACE_ID,
        message: 'Workspace ID uses reserved identifier',
        severity: ValidationSeverity.ERROR,
        field: 'workspaceId',
      },
      auditInfo: {
        timestamp,
        operation: 'validateWorkspaceId',
        workspaceId,
        denialReason: 'Reserved workspace ID',
      },
    };
  }

  return {
    isValid: true,
    auditInfo: {
      timestamp,
      operation: 'validateWorkspaceId',
      workspaceId,
    },
  };
}

/**
 * Validates that a session context has valid authentication and workspace access.
 * Implements REQ-5: Generic Authentication Context Integration.
 * 
 * @param sessionContext - The session context to validate
 * @param config - Optional validation configuration
 * @returns Validation result with workspace access context
 */
export function validateSessionContext(
  sessionContext: SessionContext,
  config: WorkspaceValidatorConfig = {}
): WorkspaceValidationResult {
  const timestamp = new Date().toISOString();
  const gracePeriod = config.sessionGracePeriodMs ?? 30000; // 30 second default grace period

  // Validate session context structure
  if (!sessionContext || typeof sessionContext !== 'object') {
    const error = {
      code: 'MALFORMED_CONTEXT' as const,
      message: 'Session context is required and must be an object',
      severity: ValidationSeverity.ERROR,
      field: 'sessionContext',
    };

    if (config.enableSecurityLogging) {
      securityLogger.logSecurityEvent({
        eventType: 'ACCESS_DENIED',
        denialReason: 'Malformed session context',
        severity: ValidationSeverity.ERROR,
      });
    }

    return {
      isValid: false,
      error,
      auditInfo: {
        timestamp,
        operation: 'validateSessionContext',
        denialReason: 'Malformed session context',
      },
    };
  }

  // Validate required fields
  const requiredFields: (keyof SessionContext)[] = ['userId', 'workspaceId', 'expiresAt'];
  for (const field of requiredFields) {
    if (!sessionContext[field]) {
      const error = {
        code: 'MISSING_REQUIRED_FIELDS' as const,
        message: `Session context missing required field: ${field}`,
        severity: ValidationSeverity.ERROR,
        field,
      };

      if (config.enableSecurityLogging) {
        securityLogger.logSecurityEvent({
          eventType: 'ACCESS_DENIED',
          userId: sessionContext.userId,
          workspaceId: sessionContext.workspaceId,
          denialReason: `Missing required field: ${field}`,
          severity: ValidationSeverity.ERROR,
        });
      }

      return {
        isValid: false,
        error,
        auditInfo: {
          timestamp,
          operation: 'validateSessionContext',
          userId: sessionContext.userId,
          workspaceId: sessionContext.workspaceId,
          denialReason: `Missing required field: ${field}`,
        },
      };
    }
  }

  // Validate workspace ID format
  const workspaceValidation = validateWorkspaceId(sessionContext.workspaceId);
  if (!workspaceValidation.isValid) {
    if (config.enableSecurityLogging) {
      securityLogger.logSecurityEvent({
        eventType: 'INVALID_WORKSPACE',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        denialReason: 'Invalid workspace ID format',
        severity: ValidationSeverity.ERROR,
      });
    }

    return {
      isValid: false,
      error: workspaceValidation.error ?? {
        code: ValidationErrorCode.INVALID_WORKSPACE_ID,
        message: 'Workspace validation failed',
        severity: ValidationSeverity.ERROR,
      },
      auditInfo: {
        timestamp: workspaceValidation.auditInfo?.timestamp ?? timestamp,
        operation: workspaceValidation.auditInfo?.operation ?? 'validateSessionContext',
        workspaceId: workspaceValidation.auditInfo?.workspaceId ?? sessionContext.workspaceId,
        userId: sessionContext.userId,
        pathRequested: workspaceValidation.auditInfo?.pathRequested,
        denialReason: workspaceValidation.auditInfo?.denialReason,
      },
    };
  }

  // Validate session expiration
  const now = Date.now();
  const expiresAt = sessionContext.expiresAt;
  
  if (now > expiresAt + gracePeriod) {
    const error = {
      code: 'SESSION_EXPIRED' as const,
      message: 'Session context has expired',
      severity: ValidationSeverity.ERROR,
      field: 'expiresAt',
    };

    if (config.enableSecurityLogging) {
      securityLogger.logSecurityEvent({
        eventType: 'SESSION_EXPIRED',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        denialReason: 'Session expired',
        severity: ValidationSeverity.WARN,
      });
    }

    return {
      isValid: false,
      error,
      auditInfo: {
        timestamp,
        operation: 'validateSessionContext',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        denialReason: 'Session expired',
      },
    };
  }

  // Create validated workspace access context
  const validatedContext: WorkspaceAccessContext = {
    workspaceId: sessionContext.workspaceId,
    userId: sessionContext.userId,
    isValid: true,
    expiresAt: sessionContext.expiresAt,
  };

  if (config.enableSecurityLogging) {
    securityLogger.logSecurityEvent({
      eventType: 'ACCESS_GRANTED',
      userId: sessionContext.userId,
      workspaceId: sessionContext.workspaceId,
      severity: ValidationSeverity.INFO,
    });
  }

  return {
    isValid: true,
    validatedContext,
    auditInfo: {
      timestamp,
      operation: 'validateSessionContext',
      userId: sessionContext.userId,
      workspaceId: sessionContext.workspaceId,
    },
  };
}

/**
 * Validates workspace boundary constraints for a given path.
 * Implements REQ-2: Workspace-Level Data Partitioning and SEC-2: Path validation.
 * 
 * @param path - The path to validate against workspace boundaries
 * @param sessionContext - The authenticated session context
 * @param config - Optional validation configuration
 * @returns Validation result indicating boundary compliance
 */
export function validateWorkspaceBoundaryAccess(
  path: string,
  sessionContext: SessionContext,
  config: WorkspaceValidatorConfig = {}
): WorkspaceValidationResult {
  const timestamp = new Date().toISOString();

  // First validate the session context
  const sessionValidation = validateSessionContext(sessionContext, config);
  if (!sessionValidation.isValid) {
    return sessionValidation;
  }

  // Validate the path format
  const pathValidation = validatePath(path);
  if (!pathValidation.isValid) {
    const error = {
      code: pathValidation.error!.code,
      message: pathValidation.error!.message,
      severity: pathValidation.error!.severity,
      field: 'path',
    };

    if (config.enableSecurityLogging) {
      securityLogger.logSecurityEvent({
        eventType: 'ACCESS_DENIED',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        requestedPath: path,
        denialReason: 'Invalid path format',
        severity: ValidationSeverity.ERROR,
      });
    }

    return {
      isValid: false,
      error,
      auditInfo: {
        timestamp,
        operation: 'validateWorkspaceBoundaryAccess',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        pathRequested: path,
        denialReason: 'Invalid path format',
      },
    };
  }

  // Check workspace boundary constraints
  const expectedWorkspacePrefix = `/workspaces/${sessionContext.workspaceId}`;
  const normalizedPath = pathValidation.normalizedPath!;

  // Allow system paths if configured
  const isSystemPath = normalizedPath.startsWith('/system/');
  if (isSystemPath && config.allowSystemCrossWorkspace) {
    if (config.enableSecurityLogging) {
      securityLogger.logSecurityEvent({
        eventType: 'ACCESS_GRANTED',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        requestedPath: path,
        severity: ValidationSeverity.INFO,
        context: { operation: 'system_access_allowed' },
      });
    }

    return {
      isValid: true,
      validatedContext: sessionValidation.validatedContext!,
      auditInfo: {
        timestamp,
        operation: 'validateWorkspaceBoundaryAccess',
        userId: sessionContext.userId,
        workspaceId: sessionContext.workspaceId,
        pathRequested: path,
      },
    };
  }

  // Validate that path is within workspace boundary
  if (!normalizedPath.startsWith(expectedWorkspacePrefix)) {
    // Apply custom boundary rules if configured
    let customRulesPassed = false;
    if (config.customBoundaryRules) {
      customRulesPassed = config.customBoundaryRules.every(rule => 
        rule(sessionContext.workspaceId, normalizedPath)
      );
    }

    if (!customRulesPassed) {
      const error = {
        code: ValidationErrorCode.WORKSPACE_BOUNDARY_VIOLATION,
        message: 'Path violates workspace boundary constraints',
        severity: ValidationSeverity.CRITICAL,
        field: 'path',
      };

      if (config.enableSecurityLogging) {
        securityLogger.logSecurityEvent({
          eventType: 'BOUNDARY_VIOLATION',
          userId: sessionContext.userId,
          workspaceId: sessionContext.workspaceId,
          requestedPath: path,
          denialReason: 'Path outside workspace boundary',
          severity: ValidationSeverity.CRITICAL,
        });
      }

      return {
        isValid: false,
        error,
        auditInfo: {
          timestamp,
          operation: 'validateWorkspaceBoundaryAccess',
          userId: sessionContext.userId,
          workspaceId: sessionContext.workspaceId,
          pathRequested: path,
          denialReason: 'Workspace boundary violation',
        },
      };
    }
  }

  // Successful validation
  if (config.enableSecurityLogging) {
    securityLogger.logSecurityEvent({
      eventType: 'ACCESS_GRANTED',
      userId: sessionContext.userId,
      workspaceId: sessionContext.workspaceId,
      requestedPath: path,
      severity: ValidationSeverity.INFO,
    });
  }

  return {
    isValid: true,
    validatedContext: sessionValidation.validatedContext!,
    auditInfo: {
      timestamp,
      operation: 'validateWorkspaceBoundaryAccess',
      userId: sessionContext.userId,
      workspaceId: sessionContext.workspaceId,
      pathRequested: path,
    },
  };
}

/**
 * Creates a workspace-aware path validator function.
 * Returns a function that validates paths against a specific workspace context.
 * 
 * @param sessionContext - The session context to bind to the validator
 * @param config - Optional validation configuration
 * @returns Function that validates paths for the bound workspace
 */
export function createWorkspacePathValidator(
  sessionContext: SessionContext,
  config: WorkspaceValidatorConfig = {}
): (path: string) => WorkspaceValidationResult {
  return (path: string) => validateWorkspaceBoundaryAccess(path, sessionContext, config);
}

/**
 * Type guard to check if a validation result represents a successful workspace validation.
 * 
 * @param result - The validation result to check
 * @returns True if the result indicates successful validation with context
 */
export function isValidWorkspaceResult(
  result: WorkspaceValidationResult
): result is WorkspaceValidationResult & { validatedContext: WorkspaceAccessContext } {
  return result.isValid && !!result.validatedContext;
}

/**
 * Utility function to extract workspace ID from a path if it follows workspace conventions.
 * Returns null if the path doesn't contain a workspace ID.
 * 
 * @param path - The path to extract workspace ID from
 * @returns Workspace ID if found, null otherwise
 */
export function extractWorkspaceIdFromPath(path: string): string | null {
  const workspaceMatch = path.match(/^\/workspaces\/([^\/]+)/);
  return workspaceMatch?.[1] ?? null;
}

/**
 * Get access to the security logger for monitoring and testing purposes.
 * This should be used sparingly and primarily for monitoring/testing.
 * 
 * @returns The global security logger instance
 */
export function getSecurityLogger(): {
  getRecentLogs: (count?: number) => WorkspaceSecurityLog[];
  getFilteredLogs: (eventType?: WorkspaceSecurityLog['eventType'], sinceTimestamp?: string) => WorkspaceSecurityLog[];
} {
  return {
    getRecentLogs: securityLogger.getRecentLogs.bind(securityLogger),
    getFilteredLogs: securityLogger.getFilteredLogs.bind(securityLogger),
  };
}