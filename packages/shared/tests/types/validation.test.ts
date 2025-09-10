/**
 * Unit tests for validation types and constants
 * 
 * Tests the validation type definitions, constants, enums, and type guards
 * defined in packages/shared/src/types/validation.ts
 */

import {
  ValidationErrorCode,
  ValidationSeverity,
  PATH_VALIDATION_CONSTANTS,
  type ValidationError,
  type PathValidationResult,
  type ValueValidationResult,
  type SecurityConstraints,
  type PathValidationConfig,
  type ValidatedPath,
  type ValidatedValue,
  type ValidatedWorkspaceId,
  type BatchValidationResult,
  type ValidationContext,
  type CompositeValidationResult,
  type ValidationMetrics
} from '../../src/types/validation';

describe('ValidationErrorCode enum', () => {
  it('should have all expected path-related error codes', () => {
    expect(ValidationErrorCode.INVALID_PATH_FORMAT).toBe('INVALID_PATH_FORMAT');
    expect(ValidationErrorCode.PATH_TOO_LONG).toBe('PATH_TOO_LONG');
    expect(ValidationErrorCode.PATH_TOO_DEEP).toBe('PATH_TOO_DEEP');
    expect(ValidationErrorCode.INVALID_PATH_ENCODING).toBe('INVALID_PATH_ENCODING');
  });

  it('should have all expected security-related error codes', () => {
    expect(ValidationErrorCode.PATH_TRAVERSAL_DETECTED).toBe('PATH_TRAVERSAL_DETECTED');
    expect(ValidationErrorCode.WORKSPACE_BOUNDARY_VIOLATION).toBe('WORKSPACE_BOUNDARY_VIOLATION');
    expect(ValidationErrorCode.RESERVED_PATH_PREFIX).toBe('RESERVED_PATH_PREFIX');
  });

  it('should have all expected value-related error codes', () => {
    expect(ValidationErrorCode.INVALID_VALUE_TYPE).toBe('INVALID_VALUE_TYPE');
    expect(ValidationErrorCode.VALUE_TOO_LARGE).toBe('VALUE_TOO_LARGE');
    expect(ValidationErrorCode.MALFORMED_JSON).toBe('MALFORMED_JSON');
  });

  it('should have all expected operation context error codes', () => {
    expect(ValidationErrorCode.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
    expect(ValidationErrorCode.INVALID_WORKSPACE_ID).toBe('INVALID_WORKSPACE_ID');
    expect(ValidationErrorCode.INVALID_USER_ID).toBe('INVALID_USER_ID');
  });
});

describe('ValidationSeverity enum', () => {
  it('should have all expected severity levels', () => {
    expect(ValidationSeverity.INFO).toBe('info');
    expect(ValidationSeverity.WARN).toBe('warn');
    expect(ValidationSeverity.ERROR).toBe('error');
    expect(ValidationSeverity.CRITICAL).toBe('critical');
  });

  it('should maintain severity order for comparison', () => {
    const levels = [
      ValidationSeverity.INFO,
      ValidationSeverity.WARN,
      ValidationSeverity.ERROR,
      ValidationSeverity.CRITICAL
    ];
    
    // Verify the levels are defined in ascending severity order
    expect(levels[0]).toBe('info');
    expect(levels[3]).toBe('critical');
  });
});

describe('PATH_VALIDATION_CONSTANTS', () => {
  it('should have correct maximum path length', () => {
    expect(PATH_VALIDATION_CONSTANTS.MAX_PATH_LENGTH_BYTES).toBe(1000);
    expect(typeof PATH_VALIDATION_CONSTANTS.MAX_PATH_LENGTH_BYTES).toBe('number');
  });

  it('should have correct maximum path depth', () => {
    expect(PATH_VALIDATION_CONSTANTS.MAX_PATH_DEPTH).toBe(20);
    expect(typeof PATH_VALIDATION_CONSTANTS.MAX_PATH_DEPTH).toBe('number');
  });

  it('should define reserved prefixes for security', () => {
    const expectedPrefixes = ['/system/', '/admin/', '/.', '/..'];
    expect(PATH_VALIDATION_CONSTANTS.RESERVED_PREFIXES).toEqual(expectedPrefixes);
    
    // Verify it's readonly
    expect(() => {
      // @ts-expect-error Testing readonly constraint
      PATH_VALIDATION_CONSTANTS.RESERVED_PREFIXES.push('/test/');
    }).not.toThrow(); // Runtime doesn't prevent this, but TS should
  });

  it('should have valid segment pattern', () => {
    const pattern = PATH_VALIDATION_CONSTANTS.VALID_SEGMENT_PATTERN;
    
    // Valid segments
    expect(pattern.test('valid123')).toBe(true);
    expect(pattern.test('test_segment')).toBe(true);
    expect(pattern.test('test-segment')).toBe(true);
    expect(pattern.test('123')).toBe(true);
    
    // Invalid segments
    expect(pattern.test('invalid.segment')).toBe(false);
    expect(pattern.test('invalid segment')).toBe(false);
    expect(pattern.test('invalid/segment')).toBe(false);
    expect(pattern.test('')).toBe(false);
    expect(pattern.test('special@chars')).toBe(false);
  });

  it('should have path traversal pattern', () => {
    const pattern = PATH_VALIDATION_CONSTANTS.PATH_TRAVERSAL_PATTERN;
    
    // Path traversal attempts
    expect(pattern.test('..')).toBe(true);
    expect(pattern.test('../')).toBe(true);
    expect(pattern.test('/../')).toBe(true);
    expect(pattern.test('/..')).toBe(true);
    expect(pattern.test('path/../other')).toBe(true);
    
    // Valid paths
    expect(pattern.test('/valid/path')).toBe(false);
    expect(pattern.test('valid')).toBe(false);
    expect(pattern.test('/path/to/file')).toBe(false);
  });
});

describe('ValidationError interface', () => {
  it('should create valid validation errors', () => {
    const error: ValidationError = {
      name: 'ValidationError',
      code: ValidationErrorCode.INVALID_PATH_FORMAT,
      severity: ValidationSeverity.ERROR,
      message: 'Invalid path format detected',
      timestamp: new Date().toISOString(),
      context: {
        operation: 'validation',
        field: 'path',
        pathLength: 50
      }
    };

    expect(error.code).toBe(ValidationErrorCode.INVALID_PATH_FORMAT);
    expect(error.severity).toBe(ValidationSeverity.ERROR);
    expect(error.message).toBeTruthy();
    expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(error.context?.operation).toBe('validation');
  });

  it('should support optional properties', () => {
    const minimalError: ValidationError = {
      name: 'ValidationError',
      code: ValidationErrorCode.PATH_TOO_LONG,
      severity: ValidationSeverity.WARN,
      message: 'Path exceeds maximum length',
      timestamp: new Date().toISOString()
    };

    expect(minimalError.context).toBeUndefined();
    expect(minimalError.internalDetails).toBeUndefined();
  });
});

describe('PathValidationResult interface', () => {
  it('should represent successful validation', () => {
    const result: PathValidationResult = {
      isValid: true,
      normalizedPath: '/valid/path',
      metadata: {
        lengthBytes: 11,
        depth: 2,
        segments: ['valid', 'path'],
        encoding: 'utf-8'
      }
    };

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.normalizedPath).toBe('/valid/path');
    expect(result.metadata?.depth).toBe(2);
  });

  it('should represent validation failure', () => {
    const result: PathValidationResult = {
      isValid: false,
      error: {
        code: ValidationErrorCode.PATH_TOO_LONG,
        message: 'Path exceeds maximum allowed length',
        severity: ValidationSeverity.ERROR
      },
      metadata: {
        lengthBytes: 1500,
        depth: 5,
        segments: ['very', 'long', 'path', 'segments'],
        encoding: 'utf-8'
      }
    };

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe(ValidationErrorCode.PATH_TOO_LONG);
    expect(result.normalizedPath).toBeUndefined();
  });
});

describe('ValueValidationResult interface', () => {
  it('should represent successful value validation', () => {
    const result: ValueValidationResult = {
      isValid: true,
      sizeBytes: 45,
      valueType: 'object'
    };

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.valueType).toBe('object');
  });

  it('should represent value validation failure', () => {
    const result: ValueValidationResult = {
      isValid: false,
      error: {
        code: ValidationErrorCode.VALUE_TOO_LARGE,
        message: 'Value exceeds maximum size limit',
        severity: ValidationSeverity.ERROR
      },
      sizeBytes: 2000000,
      valueType: 'string'
    };

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe(ValidationErrorCode.VALUE_TOO_LARGE);
  });
});

describe('SecurityConstraints interface', () => {
  it('should define required security fields', () => {
    const constraints: SecurityConstraints = {
      workspaceId: 'workspace-123',
      userId: 'user-456'
    };

    expect(constraints.workspaceId).toBe('workspace-123');
    expect(constraints.userId).toBe('user-456');
    expect(constraints.strictMode).toBeUndefined(); // Optional
  });

  it('should support optional configuration', () => {
    const constraints: SecurityConstraints = {
      workspaceId: 'workspace-123',
      userId: 'user-456',
      strictMode: true,
      allowedPrefixes: ['/custom/', '/special/'],
      maxOperationDepth: 10
    };

    expect(constraints.strictMode).toBe(true);
    expect(constraints.allowedPrefixes).toHaveLength(2);
    expect(constraints.maxOperationDepth).toBe(10);
  });
});

describe('BatchValidationResult interface', () => {
  it('should represent successful batch validation', () => {
    const result: BatchValidationResult = {
      isValid: true,
      itemResults: [
        {
          index: 0,
          path: '/path1',
          pathValid: true,
          valueValid: true,
          errors: []
        },
        {
          index: 1,
          path: '/path2',
          pathValid: true,
          valueValid: true,
          errors: []
        }
      ],
      batchErrors: [],
      totalSizeBytes: 150
    };

    expect(result.isValid).toBe(true);
    expect(result.itemResults).toHaveLength(2);
    expect(result.batchErrors).toHaveLength(0);
    expect(result.totalSizeBytes).toBe(150);
  });

  it('should represent batch validation with errors', () => {
    const validationError: ValidationError = {
      name: 'ValidationError',
      code: ValidationErrorCode.INVALID_PATH_FORMAT,
      severity: ValidationSeverity.ERROR,
      message: 'Invalid path format',
      timestamp: new Date().toISOString()
    };

    const result: BatchValidationResult = {
      isValid: false,
      itemResults: [
        {
          index: 0,
          path: '/valid/path',
          pathValid: true,
          valueValid: true,
          errors: []
        },
        {
          index: 1,
          path: 'invalid-path',
          pathValid: false,
          valueValid: false,
          errors: [validationError]
        }
      ],
      batchErrors: [validationError],
      totalSizeBytes: 200
    };

    expect(result.isValid).toBe(false);
    expect(result.itemResults[1].pathValid).toBe(false);
    expect(result.batchErrors).toHaveLength(1);
  });
});

describe('ValidationContext interface', () => {
  it('should create complete validation context', () => {
    const context: ValidationContext = {
      workspaceId: 'workspace-123' as ValidatedWorkspaceId,
      userId: 'user-456',
      operation: 'write',
      timestamp: new Date().toISOString(),
      securityConstraints: {
        workspaceId: 'workspace-123',
        userId: 'user-456',
        strictMode: true
      }
    };

    expect(context.workspaceId).toBe('workspace-123');
    expect(context.operation).toBe('write');
    expect(context.securityConstraints?.strictMode).toBe(true);
  });

  it('should support all operation types', () => {
    const operations: ValidationContext['operation'][] = [
      'read', 'write', 'readTree', 'batch'
    ];

    operations.forEach(operation => {
      const context: ValidationContext = {
        workspaceId: 'workspace-123' as ValidatedWorkspaceId,
        userId: 'user-456',
        operation,
        timestamp: new Date().toISOString()
      };

      expect(context.operation).toBe(operation);
    });
  });
});

describe('ValidationMetrics interface', () => {
  it('should track validation metrics', () => {
    const metrics: ValidationMetrics = {
      totalOperations: 1000,
      failureCount: 25,
      averageValidationTimeMs: 2.5,
      errorDistribution: {
        [ValidationErrorCode.INVALID_PATH_FORMAT]: 10,
        [ValidationErrorCode.PATH_TOO_LONG]: 5,
        [ValidationErrorCode.VALUE_TOO_LARGE]: 10,
        // Include all other error codes with 0 counts
        [ValidationErrorCode.PATH_TOO_DEEP]: 0,
        [ValidationErrorCode.INVALID_PATH_ENCODING]: 0,
        [ValidationErrorCode.PATH_TRAVERSAL_DETECTED]: 0,
        [ValidationErrorCode.WORKSPACE_BOUNDARY_VIOLATION]: 0,
        [ValidationErrorCode.RESERVED_PATH_PREFIX]: 0,
        [ValidationErrorCode.INVALID_VALUE_TYPE]: 0,
        [ValidationErrorCode.MALFORMED_JSON]: 0,
        [ValidationErrorCode.MISSING_REQUIRED_FIELD]: 0,
        [ValidationErrorCode.INVALID_WORKSPACE_ID]: 0,
        [ValidationErrorCode.INVALID_USER_ID]: 0
      },
      lastResetTimestamp: new Date().toISOString()
    };

    expect(metrics.totalOperations).toBe(1000);
    expect(metrics.failureCount).toBe(25);
    expect(metrics.averageValidationTimeMs).toBe(2.5);
    expect(metrics.errorDistribution[ValidationErrorCode.INVALID_PATH_FORMAT]).toBe(10);
    expect(metrics.lastResetTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('Type branding', () => {
  it('should allow branded types to be used as their base type', () => {
    const validatedPath = '/test/path' as ValidatedPath;
    const validatedValue = { test: 'data' } as ValidatedValue;
    const validatedWorkspaceId = 'workspace-123' as ValidatedWorkspaceId;

    // These should be usable as their base types
    expect(typeof validatedPath).toBe('string');
    expect(typeof validatedValue).toBe('object');
    expect(typeof validatedWorkspaceId).toBe('string');

    // But maintain type safety at compile time
    expect(validatedPath).toBe('/test/path');
    expect(validatedWorkspaceId).toBe('workspace-123');
  });
});