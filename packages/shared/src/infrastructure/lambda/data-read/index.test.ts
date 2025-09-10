/**
 * Tests for the Lambda read function
 */

import { handler } from './index';
import { getDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the DynamoDB client
jest.mock('../shared/dynamodb-client');

const mockGetDynamoDBClient = getDynamoDBClient as jest.MockedFunction<typeof getDynamoDBClient>;
const mockGet = jest.fn();

mockGetDynamoDBClient.mockReturnValue({
  get: mockGet,
} as any);

// Helper function to create test events
function createTestEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/read',
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

describe('Lambda Read Function', () => {
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      expect(result.body).toBe('');
    });
  });

  describe('Request validation', () => {
    it('should return 400 for missing workspaceId', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          path: '/test/path',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('workspaceId is required');
    });

    it('should return 400 for missing path', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.message).toContain('path is required');
    });

    it('should return 400 for invalid path format', async () => {
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: 'invalid-path', // Should start with /
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
          workspaceId: 'invalid workspace!@#',
          path: '/test/path',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('authorization');
    });
  });

  describe('Read operations', () => {
    it('should successfully read existing data', async () => {
      const testData = { content: 'test content', timestamp: '2023-01-01' };
      mockGet.mockResolvedValue({
        Item: { id: 'test-workspace/test/path', data: testData },
        ConsumedCapacity: undefined,
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          operation: 'read',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(testData);
      expect(body.metadata.found).toBe(true);
      expect(body.metadata.defaultUsed).toBe(false);

      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Key: { id: 'test-workspace/test/path' },
        ConsistentRead: true,
      });
    });

    it('should return null for non-existing data without default', async () => {
      mockGet.mockResolvedValue({
        Item: undefined,
        ConsumedCapacity: undefined,
      });

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          operation: 'read',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toBe(null);
      expect(body.metadata.found).toBe(false);
      expect(body.metadata.defaultUsed).toBe(false);
    });

    it('should return default value for non-existing data with readWithDefault', async () => {
      mockGet.mockResolvedValue({
        Item: undefined,
        ConsumedCapacity: undefined,
      });

      const defaultValue = { default: 'content' };
      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
          operation: 'readWithDefault',
          defaultValue,
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(defaultValue);
      expect(body.metadata.found).toBe(false);
      expect(body.metadata.defaultUsed).toBe(true);
    });
  });

  describe('Query parameter parsing', () => {
    it('should parse workspaceId and path from query parameters', async () => {
      mockGet.mockResolvedValue({
        Item: { id: 'test-workspace/test/path', data: { test: 'data' } },
        ConsumedCapacity: undefined,
      });

      const event = createTestEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          workspaceId: 'test-workspace',
          path: '/test/path',
        },
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Key: { id: 'test-workspace/test/path' },
        ConsistentRead: true,
      });
    });

    it('should parse default value from query parameters', async () => {
      mockGet.mockResolvedValue({
        Item: undefined,
        ConsumedCapacity: undefined,
      });

      const event = createTestEvent({
        httpMethod: 'GET',
        queryStringParameters: {
          workspaceId: 'test-workspace',
          path: '/test/path',
          defaultValue: JSON.stringify({ default: 'value' }),
        },
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data).toEqual({ default: 'value' });
      expect(body.metadata.defaultUsed).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle DynamoDB throttling errors', async () => {
      const error = new Error('Throttling');
      error.name = 'ProvisionedThroughputExceededException';
      mockGet.mockRejectedValue(error);

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('throttling');
      expect(body.error.retryable).toBe(true);
    });

    it('should handle DynamoDB validation errors', async () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationException';
      mockGet.mockRejectedValue(error);

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.retryable).toBe(false);
    });

    it('should handle unknown errors as server errors', async () => {
      const error = new Error('Unknown error');
      mockGet.mockRejectedValue(error);

      const event = createTestEvent({
        body: JSON.stringify({
          workspaceId: 'test-workspace',
          path: '/test/path',
        }),
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('server_error');
      expect(body.error.retryable).toBe(true);
    });
  });
});