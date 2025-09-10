/**
 * Integration tests for /api/data/read route
 * 
 * Tests the complete data read API endpoint including authentication,
 * validation, data client integration, and error handling.
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST, GET, PUT, DELETE } from '../../../src/app/api/data/read/route'
import { createMockRequest, createMockDataClientResponse, MOCK_WORKSPACE_ID, MOCK_USER_ID } from '../../setup'
import { createDataClient } from '@tree-chat/data-client'
import { auth } from '@clerk/nextjs/server'

// Mock the modules
jest.mock('@clerk/nextjs/server')
jest.mock('@tree-chat/data-client')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockCreateDataClient = createDataClient as jest.MockedFunction<typeof createDataClient>

describe('/api/data/read', () => {
  let mockDataClient: any

  beforeEach(() => {
    // Reset mocks
    mockDataClient = {
      read: jest.fn()
    }
    mockCreateDataClient.mockReturnValue(mockDataClient)
    
    // Default auth mock - authenticated user with organization
    mockAuth.mockResolvedValue({
      userId: MOCK_USER_ID,
      orgId: MOCK_WORKSPACE_ID,
      sessionId: 'sess_test123'
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST method', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        mockAuth.mockResolvedValue({ userId: null, orgId: null })

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication required')
      })

      it('should reject requests without organization context', async () => {
        mockAuth.mockResolvedValue({ userId: MOCK_USER_ID, orgId: null })

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Workspace context required')
      })

      it('should reject requests for unauthorized workspace', async () => {
        mockAuth.mockResolvedValue({ userId: MOCK_USER_ID, orgId: 'org_different123' })

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Access denied to workspace')
      })
    })

    describe('Input Validation', () => {
      it('should reject requests without workspaceId', async () => {
        const request = createMockRequest({
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data).toHaveValidationError('workspaceId')
      })

      it('should reject requests with invalid workspaceId type', async () => {
        const request = createMockRequest({
          workspaceId: 123, // should be string
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data).toHaveValidationError('workspaceId')
      })

      it('should reject requests without path', async () => {
        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data).toHaveValidationError('path')
      })

      it('should reject requests with invalid path type', async () => {
        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: 123 // should be string
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data).toHaveValidationError('path')
      })

      it('should reject paths not starting with /', async () => {
        const invalidPaths = [
          'sessions/123',
          'no-leading-slash',
          'relative/path'
        ]

        for (const path of invalidPaths) {
          const request = createMockRequest({
            workspaceId: MOCK_WORKSPACE_ID,
            path
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toBe('Path must start with /')
        }
      })
    })

    describe('Data Client Integration', () => {
      it('should successfully read data and return response', async () => {
        const mockData = { title: 'Test Session', createdAt: '2024-01-01' }
        mockDataClient.read.mockResolvedValue(mockData)

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toBeApiResponse()
        expect(data.data).toEqual(mockData)
        expect(data.timestamp).toBeDefined()

        // Verify data client was called correctly
        expect(mockDataClient.read).toHaveBeenCalledWith(
          MOCK_WORKSPACE_ID,
          '/sessions/123',
          MOCK_USER_ID
        )
      })

      it('should return null data when path not found', async () => {
        mockDataClient.read.mockResolvedValue(null)

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/nonexistent'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toBeNull()
        expect(data.timestamp).toBeDefined()
      })

      it('should handle various data types correctly', async () => {
        const testCases = [
          { value: 'string value', description: 'string' },
          { value: 42, description: 'number' },
          { value: true, description: 'boolean' },
          { value: { nested: 'object' }, description: 'object' },
          { value: ['array', 'values'], description: 'array' },
          { value: null, description: 'null' }
        ]

        for (const testCase of testCases) {
          mockDataClient.read.mockResolvedValue(testCase.value)

          const request = createMockRequest({
            workspaceId: MOCK_WORKSPACE_ID,
            path: `/test/${testCase.description}`
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.data).toEqual(testCase.value)
        }
      })
    })

    describe('Error Handling', () => {
      it('should handle workspace access denied errors', async () => {
        mockDataClient.read.mockRejectedValue(new Error('WORKSPACE_ACCESS_DENIED: Access denied'))

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Access denied to workspace data')
      })

      it('should handle invalid path errors', async () => {
        mockDataClient.read.mockRejectedValue(new Error('INVALID_PATH: Path format invalid'))

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/invalid/../path'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid data path format')
      })

      it('should handle timeout errors', async () => {
        mockDataClient.read.mockRejectedValue(new Error('TIMEOUT: Operation timed out'))

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(504)
        expect(data.error).toBe('Operation timed out')
      })

      it('should handle generic errors as internal server error', async () => {
        mockDataClient.read.mockRejectedValue(new Error('Unexpected error'))

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })

      it('should handle non-Error objects', async () => {
        mockDataClient.read.mockRejectedValue('String error')

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })

      it('should handle malformed JSON requests', async () => {
        const request = {
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
          method: 'POST'
        } as any

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })
    })

    describe('Data Client Configuration', () => {
      it('should configure data client with correct parameters', async () => {
        mockDataClient.read.mockResolvedValue({})

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        await POST(request)

        expect(mockCreateDataClient).toHaveBeenCalledWith({
          lambdaEndpoint: 'http://localhost:2024', // from test env
          timeoutMs: 10000,
          auth: {
            apiKey: 'test-api-key' // from test env
          },
          retry: {
            maxRetries: 3,
            baseDelayMs: 1000
          }
        })
      })

      it('should use environment variables for configuration', async () => {
        const originalEndpoint = process.env.DATA_LAMBDA_ENDPOINT
        const originalApiKey = process.env.DATA_API_KEY

        process.env.DATA_LAMBDA_ENDPOINT = 'https://custom-endpoint.com'
        process.env.DATA_API_KEY = 'custom-api-key'

        mockDataClient.read.mockResolvedValue({})

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        await POST(request)

        expect(mockCreateDataClient).toHaveBeenCalledWith(
          expect.objectContaining({
            lambdaEndpoint: 'https://custom-endpoint.com',
            auth: { apiKey: 'custom-api-key' }
          })
        )

        // Restore original values
        process.env.DATA_LAMBDA_ENDPOINT = originalEndpoint
        process.env.DATA_API_KEY = originalApiKey
      })
    })

    describe('Response Format', () => {
      it('should always include timestamp in response', async () => {
        mockDataClient.read.mockResolvedValue({ test: 'data' })

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const beforeTime = new Date().toISOString()
        const response = await POST(request)
        const afterTime = new Date().toISOString()
        const data = await response.json()

        expect(data.timestamp).toBeDefined()
        expect(data.timestamp).toBeGreaterThanOrEqual(beforeTime)
        expect(data.timestamp).toBeLessThanOrEqual(afterTime)
      })

      it('should include data field in successful responses', async () => {
        mockDataClient.read.mockResolvedValue({ test: 'data' })

        const request = createMockRequest({
          workspaceId: MOCK_WORKSPACE_ID,
          path: '/sessions/123'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(data).toHaveProperty('data')
        expect(data).toHaveProperty('timestamp')
        expect(data).not.toHaveProperty('error')
      })
    })
  })

  describe('HTTP Method Restrictions', () => {
    it('should reject GET requests', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response).toHaveStatusCode(405)
      expect(data.error).toBe('Method not allowed. Use POST.')
    })

    it('should reject PUT requests', async () => {
      const response = await PUT()
      const data = await response.json()

      expect(response).toHaveStatusCode(405)
      expect(data.error).toBe('Method not allowed. Use POST.')
    })

    it('should reject DELETE requests', async () => {
      const response = await DELETE()
      const data = await response.json()

      expect(response).toHaveStatusCode(405)
      expect(data.error).toBe('Method not allowed. Use POST.')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long paths', async () => {
      const longPath = '/' + 'a'.repeat(1000)
      mockDataClient.read.mockResolvedValue(null)

      const request = createMockRequest({
        workspaceId: MOCK_WORKSPACE_ID,
        path: longPath
      })

      const response = await POST(request)
      
      // Should either succeed or fail with validation error
      expect([200, 400]).toContain(response.status)
      
      if (response.status === 200) {
        expect(mockDataClient.read).toHaveBeenCalledWith(
          MOCK_WORKSPACE_ID,
          longPath,
          MOCK_USER_ID
        )
      }
    })

    it('should handle Unicode paths', async () => {
      const unicodePath = '/sessions/用户123'
      mockDataClient.read.mockResolvedValue({ title: 'Unicode Session' })

      const request = createMockRequest({
        workspaceId: MOCK_WORKSPACE_ID,
        path: unicodePath
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.title).toBe('Unicode Session')
    })

    it('should handle empty response data gracefully', async () => {
      mockDataClient.read.mockResolvedValue(undefined)

      const request = createMockRequest({
        workspaceId: MOCK_WORKSPACE_ID,
        path: '/sessions/empty'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeUndefined()
    })
  })
});