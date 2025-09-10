/**
 * Jest setup file for web app tests
 * 
 * This file runs before each test suite and provides global configuration
 * and utilities for testing Next.js components and API routes.
 */

import '@testing-library/jest-dom'

// Global test environment setup
process.env.NODE_ENV = 'test'

// Mock environment variables for testing
process.env.DATA_LAMBDA_ENDPOINT = 'http://localhost:2024'
process.env.DATA_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_123'
process.env.CLERK_SECRET_KEY = 'sk_test_123'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}))

// Mock Clerk authentication
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn().mockResolvedValue({
    userId: 'user_test123',
    orgId: 'org_test456',
    sessionId: 'sess_test789'
  }),
  currentUser: jest.fn().mockResolvedValue({
    id: 'user_test123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User'
  })
}))

jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'user_test123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User'
    },
    isLoaded: true,
    isSignedIn: true
  }),
  useOrganization: () => ({
    organization: {
      id: 'org_test456',
      name: 'Test Organization',
      slug: 'test-org'
    },
    isLoaded: true
  }),
  SignIn: ({ children }: { children?: React.ReactNode }) => <div data-testid="sign-in">{children}</div>,
  SignUp: ({ children }: { children?: React.ReactNode }) => <div data-testid="sign-up">{children}</div>,
  UserButton: () => <div data-testid="user-button">User Menu</div>,
  OrganizationSwitcher: () => <div data-testid="org-switcher">Org Switcher</div>
}))

// Mock data client
jest.mock('@tree-chat/data-client', () => ({
  createDataClient: jest.fn(() => ({
    read: jest.fn(),
    write: jest.fn(),
    readTree: jest.fn(),
    readWithDefault: jest.fn(),
    batch: jest.fn()
  })),
  LambdaDataClient: jest.fn(),
  validatePath: jest.fn(),
  validateWorkspaceBoundary: jest.fn(),
  normalizePath: jest.fn()
}))

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeApiResponse(): R
      toHaveStatusCode(code: number): R
      toHaveValidationError(field?: string): R
    }
  }
}

// Custom Jest matchers for API testing
expect.extend({
  toBeApiResponse(received) {
    const pass = received && 
                 typeof received === 'object' &&
                 ('data' in received || 'error' in received) &&
                 'timestamp' in received;
    
    return {
      message: () => pass
        ? `Expected ${received} not to be a valid API response`
        : `Expected ${received} to be a valid API response with data/error and timestamp`,
      pass,
    };
  },
  
  toHaveStatusCode(received, expectedCode) {
    const pass = received && 
                 received.status === expectedCode;
    
    return {
      message: () => pass
        ? `Expected response not to have status code ${expectedCode}`
        : `Expected response to have status code ${expectedCode}, but got ${received?.status}`,
      pass,
    };
  },
  
  toHaveValidationError(received, expectedField) {
    if (!received || typeof received !== 'object' || !('error' in received)) {
      return {
        message: () => `Expected response to have validation error`,
        pass: false,
      };
    }
    
    const hasValidationError = received.error && 
                              typeof received.error === 'string' &&
                              (received.error.includes('Invalid') || 
                               received.error.includes('required') ||
                               received.error.includes('must'));
    
    const fieldMatches = expectedField === undefined || 
                        (received.error as string).toLowerCase().includes(expectedField.toLowerCase());
    
    const pass = hasValidationError && fieldMatches;
    
    return {
      message: () => pass
        ? `Expected response not to have validation error${expectedField ? ` for field ${expectedField}` : ''}`
        : `Expected response to have validation error${expectedField ? ` for field ${expectedField}` : ''}, but got: ${received.error}`,
      pass,
    };
  }
})

// Test data factories
export const createMockRequest = (body: any, options: { method?: string; headers?: Record<string, string> } = {}) => {
  const request = {
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    method: options.method || 'POST',
    headers: new Headers(options.headers || {}),
    url: 'http://localhost:3000/api/test',
    nextUrl: new URL('http://localhost:3000/api/test')
  }
  
  return request as any // NextRequest mock
}

export const createMockSession = (overrides: any = {}) => ({
  userId: 'user_test123',
  orgId: 'org_test456',
  sessionId: 'sess_test789',
  ...overrides
})

export const createMockDataClientResponse = (data: any = null, error?: string) => {
  if (error) {
    const errorObj = new Error(error)
    return Promise.reject(errorObj)
  }
  return Promise.resolve(data)
}

// Test data patterns
export const MOCK_WORKSPACE_ID = 'org_test456'
export const MOCK_USER_ID = 'user_test123'
export const MOCK_SESSION_ID = 'sess_test789'

export const VALID_PATHS = [
  '/',
  '/sessions',
  '/sessions/123',
  '/sessions/123/pages',
  '/sessions/123/pages/page1'
]

export const INVALID_PATHS = [
  '',
  'no-leading-slash',
  '/path/../traversal',
  '/path/with spaces',
  null,
  undefined
]

export const MOCK_SESSION_DATA = {
  sessionId: 'session-123',
  metadata: {
    title: 'Test Session',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  pages: {}
}

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

// Before/after hooks
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks()
})

afterAll(() => {
  // Clean up after all tests
  cleanupMocks()
})