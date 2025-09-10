/**
 * Unit tests for validation utilities in data-client
 * 
 * Tests path validation, workspace boundary validation, and path normalization
 * functions from packages/data-client/src/validation.ts
 */

import {
  validatePath,
  validateWorkspaceBoundary,
  normalizePath,
  createPathValidator,
  getPathSegments,
  getPathByteLength,
  isPathWithinSizeLimit,
  createValidatedPath
} from '../../src/validation';

import {
  ValidationErrorCode,
  ValidationSeverity,
  PATH_VALIDATION_CONSTANTS,
  type PathValidationConfig,
  type SecurityConstraints
} from '@tree-chat/shared';

describe('validatePath function', () => {
  it('should validate simple valid paths', () => {
    const testCases = [
      '/',
      '/sessions',
      '/sessions/123',
      '/sessions/123/pages',
      '/sessions/123/pages/page1',
      '/workspace-456/sessions/789'
    ];

    testCases.forEach(path => {
      const result = validatePath(path);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.normalizedPath).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  it('should reject empty or null paths', () => {
    const testCases = ['', null, undefined] as any[];

    testCases.forEach(path => {
      const result = validatePath(path);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.INVALID_PATH_FORMAT);
      expect(result.error?.severity).toBe(ValidationSeverity.ERROR);
    });
  });

  it('should reject paths without leading slash', () => {
    const testCases = [
      'sessions',
      'sessions/123',
      'path/without/slash'
    ];

    testCases.forEach(path => {
      const result = validatePath(path);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.INVALID_PATH_FORMAT);
    });
  });

  it('should detect path traversal attempts', () => {
    const testCases = [
      '/../parent',
      '/sessions/../other',
      '/sessions/123/../..',
      '/sessions/./current',
      '/..',
      '/sessions/..',
      '/path/with/../traversal'
    ];

    testCases.forEach(path => {
      const result = validatePath(path);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.PATH_TRAVERSAL_DETECTED);
      expect(result.error?.severity).toBe(ValidationSeverity.CRITICAL);
    });
  });

  it('should enforce path length limits', () => {
    const config: PathValidationConfig = {
      maxLengthBytes: 50 // Very short limit for testing
    };

    const longPath = '/sessions/' + 'a'.repeat(100);
    const result = validatePath(longPath, config);

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe(ValidationErrorCode.PATH_TOO_LONG);
    expect(result.metadata?.lengthBytes).toBeGreaterThan(50);
  });

  it('should enforce path depth limits', () => {
    const config: PathValidationConfig = {
      maxDepth: 3
    };

    const deepPath = '/level1/level2/level3/level4/level5';
    const result = validatePath(deepPath, config);

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe(ValidationErrorCode.PATH_TOO_DEEP);
    expect(result.metadata?.depth).toBeGreaterThan(3);
  });

  it('should handle Unicode characters correctly', () => {
    const unicodePaths = [
      '/sessions/用户123',
      '/sessions/café',
      '/sessions/测试',
      '/sessions/नमस्ते'
    ];

    unicodePaths.forEach(path => {
      const result = validatePath(path, { allowUnicode: true });
      expect(result.isValid).toBe(true);
      expect(result.normalizedPath).toBeDefined();
      expect(result.metadata?.encoding).toBe('utf-8');
    });
  });

  it('should reject Unicode when not allowed', () => {
    const unicodePath = '/sessions/用户123';
    const result = validatePath(unicodePath, { allowUnicode: false });

    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe(ValidationErrorCode.INVALID_PATH_ENCODING);
  });

  it('should validate reserved path prefixes', () => {
    const reservedPaths = [
      '/system/config',
      '/admin/users',
      '/.hidden',
      '/..parent'
    ];

    reservedPaths.forEach(path => {
      const result = validatePath(path);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.RESERVED_PATH_PREFIX);
      expect(result.error?.severity).toBe(ValidationSeverity.CRITICAL);
    });
  });

  it('should apply custom validation patterns', () => {
    const config: PathValidationConfig = {
      customPatterns: [
        {
          pattern: /\/temp\//,
          errorMessage: 'Temp paths are not allowed'
        }
      ]
    };

    const result = validatePath('/temp/file', config);
    expect(result.isValid).toBe(false);
    expect(result.error?.message).toContain('Temp paths are not allowed');
  });

  it('should provide detailed metadata for valid paths', () => {
    const path = '/sessions/123/pages/page1';
    const result = validatePath(path);

    expect(result.isValid).toBe(true);
    expect(result.metadata?.segments).toEqual(['sessions', '123', 'pages', 'page1']);
    expect(result.metadata?.depth).toBe(4);
    expect(result.metadata?.lengthBytes).toBeGreaterThan(0);
    expect(result.metadata?.encoding).toBe('utf-8');
  });
});

describe('validateWorkspaceBoundary function', () => {
  const mockConstraints: SecurityConstraints = {
    workspaceId: 'workspace-123',
    userId: 'user-456',
    strictMode: true
  };

  it('should allow paths within workspace boundary', () => {
    const validPaths = [
      '/workspaces/workspace-123/sessions/789',
      '/workspaces/workspace-123/data',
      '/workspaces/workspace-123/users/user-456'
    ];

    validPaths.forEach(path => {
      const result = validateWorkspaceBoundary(path, mockConstraints);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should reject paths outside workspace boundary', () => {
    const invalidPaths = [
      '/workspaces/workspace-456/sessions/789',
      '/workspaces/other-workspace/data',
      '/global/config'
    ];

    invalidPaths.forEach(path => {
      const result = validateWorkspaceBoundary(path, mockConstraints);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.WORKSPACE_BOUNDARY_VIOLATION);
      expect(result.error?.severity).toBe(ValidationSeverity.CRITICAL);
    });
  });

  it('should respect allowed prefixes in non-strict mode', () => {
    const constraints: SecurityConstraints = {
      workspaceId: 'workspace-123',
      userId: 'user-456',
      strictMode: false,
      allowedPrefixes: ['/global/', '/shared/']
    };

    const allowedPaths = [
      '/global/settings',
      '/shared/templates',
      '/workspaces/workspace-123/sessions/789'
    ];

    allowedPaths.forEach(path => {
      const result = validateWorkspaceBoundary(path, constraints);
      expect(result.isValid).toBe(true);
    });
  });

  it('should enforce strict mode properly', () => {
    const strictConstraints: SecurityConstraints = {
      ...mockConstraints,
      strictMode: true,
      allowedPrefixes: ['/global/']
    };

    const result = validateWorkspaceBoundary('/global/settings', strictConstraints);
    expect(result.isValid).toBe(false); // Strict mode ignores allowed prefixes
    expect(result.error?.code).toBe(ValidationErrorCode.WORKSPACE_BOUNDARY_VIOLATION);
  });
});

describe('normalizePath function', () => {
  it('should normalize basic paths', () => {
    const testCases = [
      { input: '/sessions//123', expected: '/sessions/123' },
      { input: '/sessions/123/', expected: '/sessions/123' },
      { input: '//sessions///123//', expected: '/sessions/123' },
      { input: '/sessions/123/./pages', expected: '/sessions/123/pages' }
    ];

    testCases.forEach(({ input, expected }) => {
      const result = normalizePath(input);
      expect(result).toBe(expected);
    });
  });

  it('should handle Unicode normalization', () => {
    const options = { normalizeUnicode: true };
    
    // Test combining characters
    const input = '/café'; // é as combining character
    const result = normalizePath(input, options);
    
    expect(result).toBeTruthy();
    expect(result.includes('é')).toBe(true); // Should normalize to composed form
  });

  it('should respect case sensitivity', () => {
    const input = '/Sessions/USER123/Pages';
    const result = normalizePath(input, { preserveCase: true });
    
    expect(result).toBe('/Sessions/USER123/Pages');
  });

  it('should handle trailing slash removal', () => {
    const testCases = [
      { input: '/sessions/', expected: '/sessions' },
      { input: '/sessions/123/', expected: '/sessions/123' },
      { input: '/', expected: '/' } // Root should remain unchanged
    ];

    testCases.forEach(({ input, expected }) => {
      const result = normalizePath(input, { removeTrailingSlash: true });
      expect(result).toBe(expected);
    });
  });
});

describe('getPathSegments function', () => {
  it('should extract path segments correctly', () => {
    const testCases = [
      { path: '/', expected: [] },
      { path: '/sessions', expected: ['sessions'] },
      { path: '/sessions/123', expected: ['sessions', '123'] },
      { path: '/sessions/123/pages/page1', expected: ['sessions', '123', 'pages', 'page1'] }
    ];

    testCases.forEach(({ path, expected }) => {
      const result = getPathSegments(path);
      expect(result).toEqual(expected);
    });
  });

  it('should handle paths with trailing slashes', () => {
    const result = getPathSegments('/sessions/123/');
    expect(result).toEqual(['sessions', '123']);
  });

  it('should handle paths with multiple slashes', () => {
    const result = getPathSegments('//sessions///123//');
    expect(result).toEqual(['sessions', '123']);
  });
});

describe('getPathByteLength function', () => {
  it('should calculate byte length for ASCII paths', () => {
    const path = '/sessions/123';
    const byteLength = getPathByteLength(path);
    
    expect(byteLength).toBe(path.length); // ASCII characters are 1 byte each
  });

  it('should calculate byte length for Unicode paths', () => {
    const path = '/sessions/用户123';
    const byteLength = getPathByteLength(path);
    
    expect(byteLength).toBeGreaterThan(path.length); // Unicode characters are multi-byte
  });

  it('should handle empty paths', () => {
    expect(getPathByteLength('')).toBe(0);
    expect(getPathByteLength('/')).toBe(1);
  });
});

describe('isPathWithinSizeLimit function', () => {
  it('should validate paths within size limits', () => {
    const shortPath = '/short';
    const result = isPathWithinSizeLimit(shortPath, 100);
    
    expect(result).toBe(true);
  });

  it('should reject paths exceeding size limits', () => {
    const longPath = '/very/long/path/with/many/segments/' + 'a'.repeat(100);
    const result = isPathWithinSizeLimit(longPath, 50);
    
    expect(result).toBe(false);
  });

  it('should use default limit when not specified', () => {
    const path = '/normal/path';
    const result = isPathWithinSizeLimit(path);
    
    expect(result).toBe(true);
  });
});

describe('createValidatedPath function', () => {
  it('should create validated path for valid input', () => {
    const path = '/sessions/123';
    const result = createValidatedPath(path);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toBe('/sessions/123');
  });

  it('should throw error for invalid paths', () => {
    const invalidPaths = [
      '', 
      'no-leading-slash',
      '/../traversal',
      '/system/reserved'
    ];

    invalidPaths.forEach(path => {
      expect(() => createValidatedPath(path)).toThrow();
    });
  });

  it('should throw error with correct details', () => {
    try {
      createValidatedPath('/../traversal');
      fail('Expected function to throw');
    } catch (error: any) {
      expect(error.code).toBe(ValidationErrorCode.PATH_TRAVERSAL_DETECTED);
      expect(error.message).toBeTruthy();
    }
  });
});

describe('createPathValidator function', () => {
  it('should create validator with custom configuration', () => {
    const config: PathValidationConfig = {
      maxLengthBytes: 100,
      maxDepth: 5,
      allowUnicode: false
    };

    const validator = createPathValidator(config);
    
    // Test valid path
    expect(validator('/sessions/123')).toBe(true);
    
    // Test Unicode rejection
    expect(validator('/sessions/用户123')).toBe(false);
    
    // Test depth limit
    const deepPath = '/a/b/c/d/e/f/g';
    expect(validator(deepPath)).toBe(false);
  });

  it('should create validator with default configuration', () => {
    const validator = createPathValidator();
    
    expect(validator('/sessions/123')).toBe(true);
    expect(validator('invalid-path')).toBe(false);
    expect(validator('/../traversal')).toBe(false);
  });

  it('should return type-safe results', () => {
    const validator = createPathValidator();
    const path = '/sessions/123';
    
    if (validator(path)) {
      // TypeScript should know path is ValidatedPath here
      expect(typeof path).toBe('string');
    }
  });
});

describe('Edge cases and error conditions', () => {
  it('should handle null and undefined inputs gracefully', () => {
    expect(() => validatePath(null as any)).not.toThrow();
    expect(() => validatePath(undefined as any)).not.toThrow();
    expect(() => normalizePath(null as any)).not.toThrow();
    expect(() => getPathSegments(undefined as any)).not.toThrow();
  });

  it('should handle very large paths', () => {
    const hugePath = '/' + 'a'.repeat(10000);
    const result = validatePath(hugePath);
    
    expect(result.isValid).toBe(false);
    expect(result.error?.code).toBe(ValidationErrorCode.PATH_TOO_LONG);
  });

  it('should handle paths with special characters', () => {
    const specialPaths = [
      '/path with spaces',
      '/path@with#special$chars',
      '/path%20encoded',
      '/path\nwith\twhitespace'
    ];

    specialPaths.forEach(path => {
      const result = validatePath(path);
      // These should generally be invalid due to security constraints
      expect(result.isValid).toBe(false);
    });
  });

  it('should maintain consistent behavior across multiple calls', () => {
    const path = '/sessions/123/pages/page1';
    
    // Multiple calls should return identical results
    const result1 = validatePath(path);
    const result2 = validatePath(path);
    
    expect(result1.isValid).toBe(result2.isValid);
    expect(result1.normalizedPath).toBe(result2.normalizedPath);
    expect(result1.metadata?.depth).toBe(result2.metadata?.depth);
  });
});