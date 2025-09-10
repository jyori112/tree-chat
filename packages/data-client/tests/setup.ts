/**
 * Jest setup file for data-client package tests
 * 
 * This file runs before each test suite and provides global configuration
 * and utilities for testing data client functionality.
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

// Mock fetch for HTTP testing
global.fetch = jest.fn();

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeDataResponse(): R;
      toBeErrorResponse(): R;
      toHaveRetried(times: number): R;
    }
  }
}

// Custom Jest matchers for data client testing
expect.extend({
  toBeDataResponse(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 'success' in received &&
                 received.success === true &&
                 'data' in received;
    
    return {
      message: () => pass
        ? `Expected ${received} not to be a successful data response`
        : `Expected ${received} to be a successful data response with success: true and data`,
      pass,
    };
  },
  
  toBeErrorResponse(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 'success' in received &&
                 received.success === false &&
                 'error' in received;
    
    return {
      message: () => pass
        ? `Expected ${received} not to be an error response`
        : `Expected ${received} to be an error response with success: false and error`,
      pass,
    };
  },
  
  toHaveRetried(received, expectedTimes) {
    // This matcher checks if a mock function was called the expected number of times
    // indicating retry behavior
    const pass = jest.isMockFunction(received) && 
                 received.mock.calls.length === expectedTimes + 1; // +1 for initial attempt
    
    return {
      message: () => pass
        ? `Expected function not to have retried ${expectedTimes} times`
        : `Expected function to have retried ${expectedTimes} times, but was called ${received.mock?.calls?.length || 0} times`,
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

export const createMockDataClientConfig = (overrides: any = {}) => ({
  lambdaEndpoint: 'http://localhost:2024',
  auth: { apiKey: 'test-api-key' },
  timeoutMs: 5000,
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 5000
  },
  ...overrides
});

// Mock HTTP responses
export const createMockSuccessResponse = (data: any = {}) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn().mockResolvedValue({
    success: true,
    data
  }),
  text: jest.fn().mockResolvedValue(JSON.stringify({
    success: true,
    data
  }))
});

export const createMockErrorResponse = (error: string = 'Test error', status = 400) => ({
  ok: false,
  status,
  statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
  json: jest.fn().mockResolvedValue({
    success: false,
    error: {
      code: status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      message: error
    }
  }),
  text: jest.fn().mockResolvedValue(JSON.stringify({
    success: false,
    error: {
      code: status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      message: error
    }
  }))
});

export const createMockNetworkError = () => {
  const error = new Error('Network error');
  error.name = 'TypeError';
  return error;
};

// Test data patterns
export const MOCK_SESSION_DATA = {
  sessionId: 'session-123',
  metadata: {
    title: 'Test Session',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  data: {
    messages: [],
    state: 'active'
  }
};

export const MOCK_TREE_DATA = {
  '/': {
    type: 'directory',
    children: ['sessions']
  },
  '/sessions': {
    type: 'directory',
    children: ['session-123']
  },
  '/sessions/session-123': {
    type: 'file',
    data: MOCK_SESSION_DATA
  }
};

// Utility functions for testing
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockFetchOnce = (response: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(response);
};

export const mockFetchError = (error: Error) => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(error);
};

export const expectFetchCalledWith = (url: string, options?: any) => {
  expect(global.fetch).toHaveBeenCalledWith(url, options);
};