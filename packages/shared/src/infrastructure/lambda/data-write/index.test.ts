/**
 * Tests for Lambda write function
 * 
 * Comprehensive test suite covering all write operation scenarios including:
 * - Basic write operations (create/update)
 * - Optimistic locking and version management
 * - Item size validation
 * - Error handling and edge cases
 * - Nullable-first design validation
 * - Audit trail functionality
 */

import { handler } from './index';
import { getDynamoDBClient, resetDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Mock the DynamoDB client
jest.mock('../shared/dynamodb-client');

const mockDynamoDBClient = {
  get: jest.fn(),
  put: jest.fn(),
};

const mockGetDynamoDBClient = getDynamoDBClient as jest.MockedFunction<typeof getDynamoDBClient>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDynamoDBClient.mockReturnValue(mockDynamoDBClient as any);
  
  // Reset environment variables
  process.env['DYNAMODB_TABLE'] = 'TestTable';
  process.env['NODE_ENV'] = 'test';
});

afterEach(() => {
  resetDynamoDBClient();
});

/**
 * Helper function to create mock API Gateway events
 */
function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/data/write',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    isBase64Encoded: false,
    body: null,
    ...overrides,
  };
}

/**
 * Helper function to parse response body
 */
function parseResponseBody(response: APIGatewayProxyResult): any {
  return JSON.parse(response.body);
}

describe('Lambda Write Function', () => {
  describe('CORS Handling', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const event = createMockEvent({ httpMethod: 'OPTIONS' });
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      });
      expect(response.body).toBe('');
    });
  });

  describe('Request Parsing and Validation', () => {
    it('should parse valid JSON request body', async () => {
      const requestBody = {
        workspaceId: 'test-workspace',
        path: '/test/path',
        value: { test: 'data' },
        userId: 'user123',
        operation: 'write',
      };
      
      const event = createMockEvent({
        body: JSON.stringify(requestBody),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(201); // Created
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.created).toBe(true);
      expect(responseBody.data.version).toBe(1);
    });

    it('should handle query parameters for simple writes', async () => {
      const event = createMockEvent({
        queryStringParameters: {
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: JSON.stringify({ test: 'data' }),
          userId: 'user123',
        },
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
    });

    it('should fail with missing workspaceId', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          path: '/test/path',
          value: { test: 'data' },
        }),
      });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.category).toBe('validation');
      expect(responseBody.error.message).toContain('workspaceId is required');
    });

    it('should fail with missing path', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          value: { test: 'data' },
        }),
      });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.category).toBe('validation');
      expect(responseBody.error.message).toContain('path is required');
    });

    it('should fail with invalid JSON in request body', async () => {
      const event = createMockEvent({
        body: '{ invalid json }',
      });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toContain('Invalid JSON');
    });

    it('should fail with invalid workspace ID format', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'invalid workspace!',
          path: '/test/path',
          value: { test: 'data' },
        }),
      });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.category).toBe('validation');
    });

    it('should fail with invalid path format', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: 'invalid-path-without-slash',
          value: { test: 'data' },
        }),
      });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.message).toContain('Invalid path format');
    });
  });

  describe('Basic Write Operations', () => {
    it('should create new item successfully', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data', number: 42 },
          userId: 'user123',
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.created).toBe(true);
      expect(responseBody.data.version).toBe(1);
      expect(responseBody.data.value).toEqual({ test: 'data', number: 42 });
      expect(responseBody.metadata.workspaceId).toBe('test-workspace');
      expect(responseBody.metadata.path).toBe('/test/path');
      expect(responseBody.metadata.userId).toBe('user123');
      
      // Verify DynamoDB put was called with correct parameters
      expect(mockDynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'TestTable',
          Item: expect.objectContaining({
            id: 'test-workspace/test/path',
            data: { test: 'data', number: 42 },
            version: 1,
            workspaceId: 'test-workspace',
            path: '/test/path',
            createdBy: 'user123',
            updatedBy: 'user123',
          }),
        })
      );
    });

    it('should update existing item successfully', async () => {
      const existingItem = {
        id: 'test-workspace/test/path',
        data: { old: 'data' },
        version: 3,
        workspaceId: 'test-workspace',
        path: '/test/path',
        createdBy: 'original-user',
        updatedBy: 'original-user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { new: 'data', updated: true },
          userId: 'user123',
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: existingItem });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(200); // Updated
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.created).toBe(false);
      expect(responseBody.data.version).toBe(4); // Incremented
      expect(responseBody.data.value).toEqual({ new: 'data', updated: true });
      
      // Verify DynamoDB put preserves audit fields
      expect(mockDynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            version: 4,
            createdBy: 'original-user', // Preserved
            updatedBy: 'user123', // Updated
            createdAt: '2024-01-01T00:00:00Z', // Preserved
          }),
        })
      );
    });

    it('should support null values (nullable-first design)', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/null-value',
          value: null,
          userId: 'user123',
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.value).toBeNull();
      
      expect(mockDynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            data: null,
          }),
        })
      );
    });

    it('should support complex nested objects', async () => {
      const complexValue = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, { nested: 'object' }],
        object: {
          deep: {
            nesting: 'supported',
          },
        },
      };
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/complex/data',
          value: complexValue,
          userId: 'user123',
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.value).toEqual(complexValue);
    });
  });

  describe('Optimistic Locking', () => {
    it('should handle version-based updates successfully', async () => {
      const existingItem = {
        id: 'test-workspace/test/path',
        data: { old: 'data' },
        version: 5,
        workspaceId: 'test-workspace',
        path: '/test/path',
        createdBy: 'user1',
        updatedBy: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { updated: 'data' },
          userId: 'user123',
          options: {
            expectedVersion: 5,
          },
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: existingItem });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.version).toBe(6);
      
      // Verify conditional expression was used
      expect(mockDynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ConditionExpression: 'version = :expectedVersion',
          ExpressionAttributeValues: {
            ':expectedVersion': 5,
          },
        })
      );
    });

    it('should fail with version mismatch', async () => {
      const existingItem = {
        id: 'test-workspace/test/path',
        version: 5,
        // ... other fields
      };
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { updated: 'data' },
          userId: 'user123',
          options: {
            expectedVersion: 3, // Wrong version
          },
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: existingItem });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(409); // Conflict
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.category).toBe('conflict');
      expect(responseBody.error.message).toContain('Version mismatch');
      expect(mockDynamoDBClient.put).not.toHaveBeenCalled();
    });

    it('should fail when requiring version on non-existent item', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data' },
          userId: 'user123',
          options: {
            requireVersion: true,
          },
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(409);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.category).toBe('conflict');
      expect(responseBody.error.message).toContain('does not exist');
    });

    it('should handle DynamoDB conditional check failure', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data' },
          userId: 'user123',
          options: {
            expectedVersion: 5,
          },
        }),
      });
      
      const existingItem = { version: 5 };
      mockDynamoDBClient.get.mockResolvedValue({ Item: existingItem });
      
      const conditionalError = new Error('The conditional request failed');
      conditionalError.name = 'ConditionalCheckFailedException';
      mockDynamoDBClient.put.mockRejectedValue(conditionalError);
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(409);
      expect(responseBody.error.category).toBe('conflict');
    });
  });

  describe('Item Size Validation', () => {
    it('should fail with item too large', async () => {
      // Create a large value that will exceed the size limit
      const largeValue = 'x'.repeat(400 * 1024); // 400KB string
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/large-item',
          value: { largeData: largeValue },
          userId: 'user123',
        }),
      });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(413); // Payload Too Large
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.category).toBe('size_limit');
      expect(responseBody.error.message).toContain('exceeds limit');
      expect(mockDynamoDBClient.put).not.toHaveBeenCalled();
    });

    it('should succeed with item within size limits', async () => {
      // Create a reasonably sized value
      const reasonableValue = { data: 'x'.repeat(1000) }; // 1KB
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/reasonable-item',
          value: reasonableValue,
          userId: 'user123',
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.metadata.itemSize).toBeGreaterThan(0);
      expect(mockDynamoDBClient.put).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB throttling errors', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data' },
        }),
      });
      
      const throttlingError = new Error('Rate exceeded');
      throttlingError.name = 'ProvisionedThroughputExceededException';
      
      // Mock the get call to succeed but put to fail
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockRejectedValue(throttlingError);
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(429);
      expect(responseBody.error.category).toBe('throttling');
      expect(responseBody.error.retryable).toBe(true);
    });

    it('should handle DynamoDB access denied errors', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data' },
        }),
      });
      
      const accessError = new Error('Access denied');
      accessError.name = 'AccessDeniedException';
      
      // Mock the get call to succeed but put to fail
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockRejectedValue(accessError);
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(403);
      expect(responseBody.error.category).toBe('authorization');
      expect(responseBody.error.retryable).toBe(false);
    });

    it('should handle general server errors', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data' },
        }),
      });
      
      const serverError = new Error('Internal server error');
      
      // Mock the get call to succeed but put to fail
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockRejectedValue(serverError);
      
      const response = await handler(event);
      const responseBody = parseResponseBody(response);
      
      expect(response.statusCode).toBe(500);
      expect(responseBody.error.category).toBe('server_error');
      expect(responseBody.error.retryable).toBe(true);
    });
  });

  describe('Metadata and Audit Trail', () => {
    it('should preserve and merge metadata', async () => {
      const existingItem = {
        id: 'test-workspace/test/path',
        data: { old: 'data' },
        version: 1,
        workspaceId: 'test-workspace',
        path: '/test/path',
        createdBy: 'user1',
        updatedBy: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        metadata: {
          existingKey: 'existingValue',
          toOverride: 'oldValue',
        },
      };
      
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { new: 'data' },
          userId: 'user123',
          options: {
            metadata: {
              newKey: 'newValue',
              toOverride: 'newValue',
            },
          },
        }),
      });
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: existingItem });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      const response = await handler(event);
      
      expect(mockDynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            metadata: {
              existingKey: 'existingValue',
              newKey: 'newValue',
              toOverride: 'newValue', // Overridden
            },
          }),
        })
      );
    });

    it('should include proper timestamps in audit trail', async () => {
      const event = createMockEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          value: { test: 'data' },
          userId: 'user123',
        }),
      });
      
      const beforeTime = new Date().toISOString();
      
      mockDynamoDBClient.get.mockResolvedValue({ Item: null });
      mockDynamoDBClient.put.mockResolvedValue({ ConsumedCapacity: { CapacityUnits: 1 } });
      
      await handler(event);
      
      const putCall = mockDynamoDBClient.put.mock.calls[0][0];
      const item = putCall.Item;
      
      expect(item.createdAt).toBeTruthy();
      expect(item.updatedAt).toBeTruthy();
      expect(new Date(item.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(item.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    });
  });
});