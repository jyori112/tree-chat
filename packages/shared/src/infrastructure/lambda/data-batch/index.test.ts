/**
 * Tests for the Lambda batch function
 */

import { handler } from './index';
import { getDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the DynamoDB client
jest.mock('../shared/dynamodb-client');

const mockGetDynamoDBClient = getDynamoDBClient as jest.MockedFunction<typeof getDynamoDBClient>;
const mockTransactGet = jest.fn();
const mockTransactWrite = jest.fn();

mockGetDynamoDBClient.mockReturnValue({
  transactGet: mockTransactGet,
  transactWrite: mockTransactWrite,
} as any);

// Helper function to create test events
function createTestEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/batch',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    requestContext: {} as any,
    resource: '',
    stageVariables: null,
    multiValueQueryStringParameters: null,
    ...overrides,
  };
}

describe('Lambda Batch Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['DYNAMODB_TABLE'] = 'TestTable';
  });

  afterEach(() => {
    delete process.env['DYNAMODB_TABLE'];
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const event = createTestEvent({ httpMethod: 'OPTIONS' });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      });
      expect(result.body).toBe('');
    });
  });

  describe('Request validation', () => {
    it('should return 400 for missing workspaceId', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          operations: [
            {
              id: 'op1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('workspaceId is required');
    });

    it('should return 400 for empty operations array', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('At least one operation is required');
    });

    it('should return 400 for too many operations', async () => {
      const operations = Array.from({ length: 26 }, (_, i) => ({
        id: `op${i}`,
        operation: 'read' as const,
        workspaceId: 'test-workspace',
        path: `/test/path${i}`,
      }));

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations,
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(413);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('size_limit');
      expect(body.error.message).toContain('Too many operations');
    });

    it('should return 400 for duplicate operation IDs', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'op1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path1',
            },
            {
              id: 'op1', // Duplicate ID
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path2',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Duplicate operation IDs');
    });

    it('should return 400 for invalid operation type', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'op1',
              operation: 'invalid-operation',
              workspaceId: 'test-workspace',
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Invalid operation type');
    });

    it('should return 400 for missing operation ID', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Operation ID is required');
    });

    it('should return 400 for write operation without value', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'op1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Value is required for write operations');
    });

    it('should return 400 for readWithDefault operation without defaultValue', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'op1',
              operation: 'readWithDefault',
              workspaceId: 'test-workspace',
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Default value is required for readWithDefault operations');
    });

    it('should return 400 for invalid path format', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'op1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: 'invalid-path', // Should start with /
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Invalid path format');
    });

    it('should return 400 for invalid workspace ID format', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'op1',
              operation: 'read',
              workspaceId: 'invalid workspace!', // Contains invalid characters
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Invalid workspace ID format');
    });

    it('should return 400 for invalid JSON in request body', async () => {
      const event = createTestEvent({
        body: 'invalid json',
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('Invalid JSON in request body');
    });
  });

  describe('Read operations', () => {
    it('should successfully execute read operations', async () => {
      // Mock TransactGet response with found items
      mockTransactGet.mockResolvedValueOnce({
        Responses: [
          { Item: { id: 'test-workspace/test/path1', data: 'value1' } },
          { Item: { id: 'test-workspace/test/path2', data: 'value2' } },
        ],
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'read1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path1',
            },
            {
              id: 'read2',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path2',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(2);
      expect(body.data.results[0]).toEqual({
        id: 'read1',
        success: true,
        data: 'value1',
        metadata: {
          operation: 'read',
          path: '/test/path1',
          found: true,
          defaultUsed: false,
        },
      });
      expect(body.data.summary.successful).toBe(2);
      expect(body.data.summary.reads).toBe(2);
      expect(body.data.summary.writes).toBe(0);
      
      expect(mockTransactGet).toHaveBeenCalledWith({
        TransactItems: [
          {
            Get: {
              TableName: 'TestTable',
              Key: { id: 'test-workspace/test/path1' },
              ConsistentRead: true,
            },
          },
          {
            Get: {
              TableName: 'TestTable',
              Key: { id: 'test-workspace/test/path2' },
              ConsistentRead: true,
            },
          },
        ],
      });
    });

    it('should handle read operations with not found items', async () => {
      // Mock TransactGet response with not found items
      mockTransactGet.mockResolvedValueOnce({
        Responses: [
          {}, // Not found
          { Item: { id: 'test-workspace/test/path2', data: 'value2' } },
        ],
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'read1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path1',
            },
            {
              id: 'read2',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path2',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(2);
      expect(body.data.results[0]).toEqual({
        id: 'read1',
        success: true,
        data: null,
        metadata: {
          operation: 'read',
          path: '/test/path1',
          found: false,
          defaultUsed: false,
        },
      });
      expect(body.data.results[1]).toEqual({
        id: 'read2',
        success: true,
        data: 'value2',
        metadata: {
          operation: 'read',
          path: '/test/path2',
          found: true,
          defaultUsed: false,
        },
      });
    });

    it('should handle readWithDefault operations', async () => {
      // Mock TransactGet response with not found item
      mockTransactGet.mockResolvedValueOnce({
        Responses: [{}], // Not found
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'readDefault1',
              operation: 'readWithDefault',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              defaultValue: 'default-value',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0]).toEqual({
        id: 'readDefault1',
        success: true,
        data: 'default-value',
        metadata: {
          operation: 'readWithDefault',
          path: '/test/path1',
          found: false,
          defaultUsed: true,
        },
      });
    });
  });

  describe('Write operations', () => {
    it('should successfully execute write operations', async () => {
      // Mock successful TransactWrite
      mockTransactWrite.mockResolvedValueOnce({});

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              value: 'new-value1',
              userId: 'user123',
            },
            {
              id: 'write2',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path2',
              value: 'new-value2',
              userId: 'user123',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(2);
      expect(body.data.results[0].success).toBe(true);
      expect(body.data.results[0].data.value).toBe('new-value1');
      expect(body.data.results[0].data.version).toBe(1);
      expect(body.data.results[0].data.created).toBe(true);
      expect(body.data.summary.successful).toBe(2);
      expect(body.data.summary.writes).toBe(2);
      
      expect(mockTransactWrite).toHaveBeenCalledWith({
        TransactItems: expect.arrayContaining([
          expect.objectContaining({
            Put: expect.objectContaining({
              TableName: 'TestTable',
              Item: expect.objectContaining({
                id: 'test-workspace/test/path1',
                data: 'new-value1',
                version: 1,
                workspaceId: 'test-workspace',
                path: '/test/path1',
                updatedBy: 'user123',
              }),
            }),
          }),
        ]),
      });
    });

    it('should handle write operations with version requirements', async () => {
      // Mock TransactGet for existing items
      mockTransactGet.mockResolvedValueOnce({
        Responses: [
          { Item: { id: 'test-workspace/test/path1', version: 5, data: 'old-value' } },
        ],
      });

      // Mock successful TransactWrite
      mockTransactWrite.mockResolvedValueOnce({});

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              value: 'new-value1',
              userId: 'user123',
              options: {
                expectedVersion: 5,
              },
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].success).toBe(true);
      expect(body.data.results[0].data.version).toBe(6); // Incremented version
      expect(body.data.results[0].data.created).toBe(false);
    });

    it('should handle version mismatch in write operations', async () => {
      // Mock TransactGet for existing items with different version
      mockTransactGet.mockResolvedValueOnce({
        Responses: [
          { Item: { id: 'test-workspace/test/path1', version: 3, data: 'old-value' } },
        ],
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              value: 'new-value1',
              userId: 'user123',
              options: {
                expectedVersion: 5, // Different from actual version (3)
              },
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].success).toBe(false);
      expect(body.data.results[0].error?.category).toBe('transaction_failure');
      expect(body.data.results[0].error?.message).toContain('Version mismatch');
    });

    it('should handle requireVersion when item does not exist', async () => {
      // Mock TransactGet for non-existing item
      mockTransactGet.mockResolvedValueOnce({
        Responses: [{}], // Item not found
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              value: 'new-value1',
              userId: 'user123',
              options: {
                requireVersion: true,
              },
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].success).toBe(false);
      expect(body.data.results[0].error?.category).toBe('transaction_failure');
      expect(body.data.results[0].error?.message).toContain('Item does not exist');
    });
  });

  describe('Mixed operations', () => {
    it('should successfully execute mixed read and write operations', async () => {
      // Mock TransactGet for reads
      mockTransactGet.mockResolvedValueOnce({
        Responses: [
          { Item: { id: 'test-workspace/test/path1', data: 'read-value' } },
        ],
      });

      // Mock TransactWrite for writes
      mockTransactWrite.mockResolvedValueOnce({});

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'read1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path1',
            },
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path2',
              value: 'write-value',
              userId: 'user123',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(2);
      expect(body.data.results[0].success).toBe(true);
      expect(body.data.results[0].data).toBe('read-value');
      expect(body.data.results[1].success).toBe(true);
      expect(body.data.results[1].data.value).toBe('write-value');
      expect(body.data.summary.reads).toBe(1);
      expect(body.data.summary.writes).toBe(1);
      expect(body.metadata.transactionCount).toBe(2);
      
      // Should have called both transactGet and transactWrite
      expect(mockTransactGet).toHaveBeenCalledTimes(1);
      expect(mockTransactWrite).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transaction failures', () => {
    it('should handle TransactWrite failure and return failed results', async () => {
      // Mock TransactWrite failure
      const transactError = new Error('Transaction cancelled');
      transactError.name = 'TransactionCanceledException';
      mockTransactWrite.mockRejectedValueOnce(transactError);

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              value: 'new-value1',
              userId: 'user123',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].success).toBe(false);
      expect(body.data.results[0].error?.category).toBe('transaction_failure');
      expect(body.data.results[0].error?.message).toContain('Transaction cancelled');
      expect(body.data.summary.successful).toBe(0);
      expect(body.data.summary.failed).toBe(1);
    });

    it('should handle TransactGet failure', async () => {
      // Mock TransactGet failure
      const transactError = new Error('Throttling exception');
      transactError.name = 'ThrottlingException';
      mockTransactGet.mockRejectedValueOnce(transactError);

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'read1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path1',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      // TransactGet failure should result in failed results for all operations
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].success).toBe(false);
      expect(body.data.results[0].error?.category).toBe('transaction_failure');
      expect(body.data.summary.successful).toBe(0);
      expect(body.data.summary.failed).toBe(1);
    });
  });

  describe('Authorization', () => {
    it('should return 400 for empty workspace ID (validation error)', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: '', // Empty workspace ID is a validation error
          operations: [
            {
              id: 'op1',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('workspaceId is required');
    });
  });

  describe('Edge cases', () => {
    it('should handle operations with null values', async () => {
      mockTransactWrite.mockResolvedValueOnce({});

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'write1',
              operation: 'write',
              workspaceId: 'test-workspace',
              path: '/test/path1',
              value: null, // Null value should be allowed
              userId: 'user123',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].success).toBe(true);
      expect(body.data.results[0].data.value).toBe(null);
    });

    it('should return results in the same order as operations', async () => {
      mockTransactGet.mockResolvedValueOnce({
        Responses: [
          { Item: { id: 'test-workspace/test/path2', data: 'value2' } },
          { Item: { id: 'test-workspace/test/path1', data: 'value1' } },
        ],
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          operations: [
            {
              id: 'second',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path2',
            },
            {
              id: 'first',
              operation: 'read',
              workspaceId: 'test-workspace',
              path: '/test/path1',
            },
          ],
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.results[0].id).toBe('second');
      expect(body.data.results[1].id).toBe('first');
      expect(body.data.results[0].data).toBe('value2');
      expect(body.data.results[1].data).toBe('value1');
    });
  });
});