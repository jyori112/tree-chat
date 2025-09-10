/**
 * Unit tests for session context types and interfaces
 * 
 * Tests the session context types, authentication errors, and utility types
 * defined in packages/shared/src/types/session-context.ts
 */

import {
  type SessionContext,
  type AuthenticationError,
  type SessionValidationResult,
  type SessionContextConfig,
  type WorkspaceId,
  type UserId,
  type SessionContextTypeGuard,
  type PartialSessionContext,
  type SecureSessionContext,
  type WorkspaceValidationContext,
  type CreateSessionContextOptions,
  type WorkspacePathValidator,
  type SessionRefreshResult,
  type SessionValidationRules,
  type WorkspaceAccessContext
} from '../../src/types/session-context';

describe('SessionContext interface', () => {
  const now = Date.now();
  
  it('should create valid session context', () => {
    const sessionContext: SessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours from now
      createdAt: now
    };

    expect(sessionContext.userId).toBe('user-123');
    expect(sessionContext.workspaceId).toBe('workspace-456');
    expect(sessionContext.expiresAt).toBeGreaterThan(now);
    expect(sessionContext.createdAt).toBe(now);
    expect(sessionContext.userMetadata).toBeUndefined();
  });

  it('should create session context with user metadata', () => {
    const sessionContext: SessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: now + 3600000, // 1 hour
      createdAt: now,
      userMetadata: {
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin'
      }
    };

    expect(sessionContext.userMetadata?.email).toBe('user@example.com');
    expect(sessionContext.userMetadata?.name).toBe('Test User');
    expect(sessionContext.userMetadata?.role).toBe('admin');
  });

  it('should create session context with partial user metadata', () => {
    const sessionContext: SessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: now + 3600000,
      createdAt: now,
      userMetadata: {
        email: 'user@example.com'
        // name and role are optional
      }
    };

    expect(sessionContext.userMetadata?.email).toBe('user@example.com');
    expect(sessionContext.userMetadata?.name).toBeUndefined();
    expect(sessionContext.userMetadata?.role).toBeUndefined();
  });
});

describe('AuthenticationError interface', () => {
  it('should create authentication error with all required fields', () => {
    const error: AuthenticationError = {
      name: 'AuthenticationError',
      code: 'SESSION_EXPIRED',
      message: 'Session has expired',
      timestamp: Date.now()
    };

    expect(error.code).toBe('SESSION_EXPIRED');
    expect(error.message).toBe('Session has expired');
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it('should support all error codes', () => {
    const errorCodes: AuthenticationError['code'][] = [
      'SESSION_EXPIRED',
      'INVALID_SESSION',
      'WORKSPACE_ACCESS_DENIED',
      'MALFORMED_CONTEXT',
      'MISSING_REQUIRED_FIELDS',
      'UNAUTHORIZED'
    ];

    errorCodes.forEach(code => {
      const error: AuthenticationError = {
        name: 'AuthenticationError',
        code,
        message: `Error with code ${code}`,
        timestamp: Date.now()
      };

      expect(error.code).toBe(code);
    });
  });

  it('should include optional context and details', () => {
    const partialContext: Partial<SessionContext> = {
      userId: 'user-123',
      workspaceId: 'workspace-456'
      // missing required fields like expiresAt
    };

    const error: AuthenticationError = {
      name: 'AuthenticationError',
      code: 'MALFORMED_CONTEXT',
      message: 'Session context is missing required fields',
      timestamp: Date.now(),
      context: partialContext,
      details: {
        missingFields: ['expiresAt', 'createdAt'],
        validationStep: 'required-field-check'
      }
    };

    expect(error.context?.userId).toBe('user-123');
    expect(error.details.missingFields).toContain('expiresAt');
    expect(error.details.validationStep).toBe('required-field-check');
  });
});

describe('SessionValidationResult interface', () => {
  it('should create successful validation result', () => {
    const result: SessionValidationResult = {
      isValid: true,
      remainingTtl: 3600000 // 1 hour in milliseconds
    };

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.remainingTtl).toBe(3600000);
  });

  it('should create failed validation result', () => {
    const result: SessionValidationResult = {
      isValid: false,
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Session has expired',
        field: 'expiresAt'
      }
    };

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe('SESSION_EXPIRED');
    expect(result.error?.field).toBe('expiresAt');
    expect(result.remainingTtl).toBeUndefined();
  });

  it('should create failed validation without field specification', () => {
    const result: SessionValidationResult = {
      isValid: false,
      error: {
        code: 'INVALID_SESSION',
        message: 'Session context is invalid'
      }
    };

    expect(result.isValid).toBe(false);
    expect(result.error?.field).toBeUndefined();
  });
});

describe('SessionContextConfig interface', () => {
  it('should create default configuration', () => {
    const config: SessionContextConfig = {};

    expect(config.expirationGracePeriodMs).toBeUndefined();
    expect(config.allowExpiredSessions).toBeUndefined();
    expect(config.customValidator).toBeUndefined();
  });

  it('should create complete configuration', () => {
    const customValidator = (context: SessionContext) => {
      return context.userId.startsWith('user-');
    };

    const config: SessionContextConfig = {
      expirationGracePeriodMs: 300000, // 5 minutes
      allowExpiredSessions: false,
      customValidator
    };

    expect(config.expirationGracePeriodMs).toBe(300000);
    expect(config.allowExpiredSessions).toBe(false);
    expect(typeof config.customValidator).toBe('function');
    
    // Test custom validator
    const testContext: SessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now()
    };
    expect(config.customValidator!(testContext)).toBe(true);
  });
});

describe('Utility Types', () => {
  it('should extract WorkspaceId type correctly', () => {
    const workspaceId: WorkspaceId = 'workspace-123';
    expect(typeof workspaceId).toBe('string');
    expect(workspaceId).toBe('workspace-123');
  });

  it('should extract UserId type correctly', () => {
    const userId: UserId = 'user-456';
    expect(typeof userId).toBe('string');
    expect(userId).toBe('user-456');
  });

  it('should create PartialSessionContext with required fields', () => {
    const partialContext: PartialSessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456'
      // expiresAt, createdAt, userMetadata are optional
    };

    expect(partialContext.userId).toBe('user-123');
    expect(partialContext.workspaceId).toBe('workspace-456');
    expect(partialContext.expiresAt).toBeUndefined();
    expect(partialContext.createdAt).toBeUndefined();
  });

  it('should create PartialSessionContext with optional fields', () => {
    const partialContext: PartialSessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: Date.now() + 3600000,
      userMetadata: {
        email: 'test@example.com'
      }
    };

    expect(partialContext.userId).toBe('user-123');
    expect(partialContext.expiresAt).toBeDefined();
    expect(partialContext.userMetadata?.email).toBe('test@example.com');
  });

  it('should create SecureSessionContext with required expiration fields', () => {
    const now = Date.now();
    const secureContext: SecureSessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: now + 3600000,
      createdAt: now
      // userMetadata is still optional
    };

    expect(secureContext.expiresAt).toBeDefined();
    expect(secureContext.createdAt).toBeDefined();
    expect(secureContext.expiresAt).toBeGreaterThan(secureContext.createdAt);
  });

  it('should create WorkspaceValidationContext with minimal required fields', () => {
    const validationContext: WorkspaceValidationContext = {
      workspaceId: 'workspace-123',
      userId: 'user-456',
      expiresAt: Date.now() + 3600000
    };

    expect(validationContext.workspaceId).toBe('workspace-123');
    expect(validationContext.userId).toBe('user-456');
    expect(validationContext.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe('CreateSessionContextOptions interface', () => {
  it('should create minimal session context options', () => {
    const options: CreateSessionContextOptions = {
      userId: 'user-123',
      workspaceId: 'workspace-456'
    };

    expect(options.userId).toBe('user-123');
    expect(options.workspaceId).toBe('workspace-456');
    expect(options.sessionLifetimeMs).toBeUndefined();
    expect(options.userMetadata).toBeUndefined();
  });

  it('should create complete session context options', () => {
    const options: CreateSessionContextOptions = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      sessionLifetimeMs: 86400000, // 24 hours
      userMetadata: {
        email: 'user@example.com',
        name: 'Test User',
        role: 'member'
      }
    };

    expect(options.sessionLifetimeMs).toBe(86400000);
    expect(options.userMetadata?.email).toBe('user@example.com');
    expect(options.userMetadata?.role).toBe('member');
  });
});

describe('SessionRefreshResult interface', () => {
  it('should create successful refresh result', () => {
    const now = Date.now();
    const newContext: SessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: now + 3600000,
      createdAt: now
    };

    const result: SessionRefreshResult = {
      success: true,
      newContext
    };

    expect(result.success).toBe(true);
    expect(result.newContext).toEqual(newContext);
    expect(result.error).toBeUndefined();
  });

  it('should create failed refresh result', () => {
    const error: AuthenticationError = {
      name: 'AuthenticationError',
      code: 'SESSION_EXPIRED',
      message: 'Cannot refresh expired session',
      timestamp: Date.now()
    };

    const result: SessionRefreshResult = {
      success: false,
      error
    };

    expect(result.success).toBe(false);
    expect(result.newContext).toBeUndefined();
    expect(result.error?.code).toBe('SESSION_EXPIRED');
  });
});

describe('SessionValidationRules interface', () => {
  it('should create default validation rules', () => {
    const rules: SessionValidationRules = {};

    expect(rules.minRemainingTimeMs).toBeUndefined();
    expect(rules.requireUserMetadata).toBeUndefined();
    expect(rules.customRules).toBeUndefined();
  });

  it('should create complete validation rules', () => {
    const customRule = (context: SessionContext): SessionValidationResult => {
      return {
        isValid: context.userId.startsWith('user-'),
        error: context.userId.startsWith('user-') ? undefined : {
          code: 'INVALID_SESSION',
          message: 'Invalid user ID format'
        }
      };
    };

    const rules: SessionValidationRules = {
      minRemainingTimeMs: 600000, // 10 minutes
      requireUserMetadata: true,
      customRules: [customRule]
    };

    expect(rules.minRemainingTimeMs).toBe(600000);
    expect(rules.requireUserMetadata).toBe(true);
    expect(rules.customRules).toHaveLength(1);
    expect(typeof rules.customRules![0]).toBe('function');

    // Test custom rule
    const validContext: SessionContext = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now()
    };

    const invalidContext: SessionContext = {
      userId: 'invalid-123',
      workspaceId: 'workspace-456',
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now()
    };

    expect(customRule(validContext).isValid).toBe(true);
    expect(customRule(invalidContext).isValid).toBe(false);
  });
});

describe('WorkspaceAccessContext interface', () => {
  it('should create workspace access context', () => {
    const accessContext: WorkspaceAccessContext = {
      workspaceId: 'workspace-123',
      userId: 'user-456',
      isValid: true,
      expiresAt: Date.now() + 3600000
    };

    expect(accessContext.workspaceId).toBe('workspace-123');
    expect(accessContext.userId).toBe('user-456');
    expect(accessContext.isValid).toBe(true);
    expect(accessContext.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should create invalid workspace access context', () => {
    const accessContext: WorkspaceAccessContext = {
      workspaceId: 'workspace-123',
      userId: 'user-456',
      isValid: false,
      expiresAt: Date.now() - 3600000 // expired
    };

    expect(accessContext.isValid).toBe(false);
    expect(accessContext.expiresAt).toBeLessThan(Date.now());
  });
});

describe('WorkspacePathValidator type', () => {
  it('should validate workspace paths correctly', () => {
    const validator: WorkspacePathValidator = (workspaceId, path) => {
      return path.startsWith(`/workspaces/${workspaceId}/`);
    };

    expect(validator('workspace-123', '/workspaces/workspace-123/sessions/456')).toBe(true);
    expect(validator('workspace-123', '/workspaces/workspace-456/sessions/456')).toBe(false);
    expect(validator('workspace-123', '/invalid/path')).toBe(false);
  });

  it('should allow flexible validation logic', () => {
    const flexibleValidator: WorkspacePathValidator = (workspaceId, path) => {
      // Allow both workspace-prefixed and root paths for this workspace
      return path.startsWith(`/workspaces/${workspaceId}/`) || 
             (path.startsWith('/') && workspaceId === 'workspace-admin');
    };

    expect(flexibleValidator('workspace-admin', '/global/settings')).toBe(true);
    expect(flexibleValidator('workspace-user', '/global/settings')).toBe(false);
    expect(flexibleValidator('workspace-user', '/workspaces/workspace-user/data')).toBe(true);
  });
});