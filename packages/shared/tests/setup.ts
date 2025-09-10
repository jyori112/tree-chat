/**
 * Jest setup file for shared package tests
 * 
 * This file runs before each test suite and provides global configuration
 * and utilities for testing shared types and validation utilities.
 */

// Global test environment setup
process.env.NODE_ENV = 'test';

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  // Preserve original methods for assertions
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Mock console methods but allow explicit testing
  global.console = {
    ...console,
    error: jest.fn(originalError),
    warn: jest.fn(originalWarn),
    log: jest.fn(console.log),
    debug: jest.fn(console.debug),
    info: jest.fn(console.info)
  };
}

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidationError(): R;
      toHaveValidationErrors(count?: number): R;
    }
  }
}

// Custom Jest matchers for validation testing
expect.extend({
  toBeValidationError(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 'success' in received &&
                 received.success === false &&
                 'errors' in received &&
                 Array.isArray(received.errors);
    
    return {
      message: () => pass
        ? `Expected ${received} not to be a validation error`
        : `Expected ${received} to be a validation error with success: false and errors array`,
      pass,
    };
  },
  
  toHaveValidationErrors(received, expectedCount) {
    if (!received || typeof received !== 'object' || !('errors' in received)) {
      return {
        message: () => `Expected ${received} to have validation errors`,
        pass: false,
      };
    }
    
    const errors = received.errors as unknown[];
    const actualCount = Array.isArray(errors) ? errors.length : 0;
    const pass = expectedCount === undefined ? actualCount > 0 : actualCount === expectedCount;
    
    return {
      message: () => pass
        ? `Expected ${received} not to have ${expectedCount || 'any'} validation errors`
        : `Expected ${received} to have ${expectedCount || 'some'} validation errors, but got ${actualCount}`,
      pass,
    };
  }
});

// Test data factories and utilities
export const createMockWorkspaceId = (suffix = '123'): string => `workspace-${suffix}`;
export const createMockUserId = (suffix = '456'): string => `user-${suffix}`;
export const createMockPath = (path = '/test/path'): string => path;

export const createMockSessionContext = (overrides: any = {}) => ({
  workspaceId: createMockWorkspaceId(),
  userId: createMockUserId(),
  authenticated: true,
  permissions: ['read', 'write'],
  ...overrides
});

// Mock data patterns
export const VALID_WORKSPACE_IDS = [
  'workspace-abc123',
  'workspace-def456',
  'workspace-xyz789'
];

export const INVALID_WORKSPACE_IDS = [
  '',
  'invalid',
  'workspace-',
  'not-workspace-123',
  'workspace-123-extra',
  null,
  undefined
];

export const VALID_PATHS = [
  '/',
  '/sessions',
  '/sessions/123',
  '/sessions/123/data',
  '/workspace-abc/sessions/456'
];

export const INVALID_PATHS = [
  '',
  'no-leading-slash',
  '/path/../traversal',
  '/path/./current',
  '//double-slash',
  '/path/with spaces',
  null,
  undefined
];

export const VALID_USER_IDS = [
  'user-abc123',
  'user-def456',
  'user-xyz789'
];

export const INVALID_USER_IDS = [
  '',
  'invalid',
  'user-',
  'not-user-123',
  null,
  undefined
];