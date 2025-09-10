/**
 * Tests for Lambda tree query function
 */

import { handler } from './index';
import { getDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';

// Mock the DynamoDB client
jest.mock('../shared/dynamodb-client');
const mockGetDynamoDBClient = getDynamoDBClient as jest.MockedFunction<typeof getDynamoDBClient>;

// Create mock DynamoDB client
const mockDynamoDBClient = {
  scan: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDynamoDBClient.mockReturnValue(mockDynamoDBClient as any);
  process.env['DYNAMODB_TABLE'] = 'TestTreeChatData';
});

// Helper function to create test events
const createTestEvent = (
  httpMethod: string = 'POST',
  body?: any,
  queryParams?: Record<string, string>
): APIGatewayProxyEvent => ({
  httpMethod,
  path: '/tree-query',
  pathParameters: null,
  queryStringParameters: queryParams || null,
  headers: {},
  multiValueHeaders: {},
  body: body ? JSON.stringify(body) : null,
  isBase64Encoded: false,
  stageVariables: null,
  requestContext: {} as any,
  multiValueQueryStringParameters: null,
  resource: '',
});

// Mock context (not used in our handler but required by AWS Lambda)
const mockContext: Context = {} as Context;

describe('Lambda Tree Query Handler', () => {
  describe('Request Parsing and Validation', () => {
    test('should parse POST request body correctly', async () => {
      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
        userId: 'user123',
        limit: 50,
      };

      mockDynamoDBClient.scan.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDBClient.scan).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'begins_with(id, :pathPrefix)',
          ExpressionAttributeValues: {
            ':pathPrefix': 'test-workspace/documents',
          },
          Limit: 50,
        })
      );
    });

    test('should parse GET request query parameters correctly', async () => {
      mockDynamoDBClient.scan.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const queryParams = {
        workspaceId: 'test-workspace',
        pathPrefix: '/api',
        limit: '25',
      };

      const event = createTestEvent('GET', undefined, queryParams);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      expect(mockDynamoDBClient.scan).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'begins_with(id, :pathPrefix)',
          ExpressionAttributeValues: {
            ':pathPrefix': 'test-workspace/api',
          },
          Limit: 25,
        })
      );
    });

    test('should handle CORS preflight requests', async () => {
      const event = createTestEvent('OPTIONS');
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.body).toBe('');
    });
  });

  describe('Validation Errors', () => {
    test('should return 400 for missing workspaceId', async () => {
      const requestBody = {
        pathPrefix: '/documents',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('workspaceId is required');
      expect(body.error.category).toBe('validation');
    });

    test('should return 400 for missing pathPrefix', async () => {
      const requestBody = {
        workspaceId: 'test-workspace',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('pathPrefix is required');
      expect(body.error.category).toBe('validation');
    });

    test('should return 400 for invalid pathPrefix format', async () => {
      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: 'invalid-path', // Missing leading slash
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Invalid path prefix format');
    });

    test('should return 400 for invalid limit range', async () => {
      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
        limit: 1500, // Exceeds maximum
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('limit must be between 1 and 1000');
    });
  });

  describe('DynamoDB Query Operations', () => {
    test('should perform query with begins_with condition', async () => {
      const testItems = [
        { id: 'test-workspace/documents/file1.txt', data: { content: 'File 1' } },
        { id: 'test-workspace/documents/file2.txt', data: { content: 'File 2' } },
      ];

      mockDynamoDBClient.scan.mockResolvedValue({
        Items: testItems,
        LastEvaluatedKey: undefined,
      });

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        '/documents/file1.txt': { content: 'File 1' },
        '/documents/file2.txt': { content: 'File 2' },
      });
      expect(body.metadata.itemCount).toBe(2);
      expect(body.metadata.hasMore).toBe(false);
    });

    test('should handle pagination correctly', async () => {
      const testItems = [
        { id: 'test-workspace/docs/file1.txt', data: { content: 'File 1' } },
      ];

      const lastEvaluatedKey = { id: 'test-workspace/docs/file1.txt' };

      mockDynamoDBClient.scan.mockResolvedValue({
        Items: testItems,
        LastEvaluatedKey: lastEvaluatedKey,
      });

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/docs',
        limit: 1,
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.metadata.hasMore).toBe(true);
      expect(body.metadata.lastKey).toBe(JSON.stringify(lastEvaluatedKey));
    });

    test('should return empty object {} for no results', async () => {
      mockDynamoDBClient.scan.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/nonexistent',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toEqual({});
      expect(body.metadata.itemCount).toBe(0);
      expect(body.metadata.hasMore).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle DynamoDB throttling errors', async () => {
      const throttleError = new Error('Request rate is too high');
      throttleError.name = 'ProvisionedThroughputExceededException';
      mockDynamoDBClient.scan.mockRejectedValue(throttleError);

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('throttling');
      expect(body.error.retryable).toBe(true);
    });

    test('should handle DynamoDB validation errors', async () => {
      const validationError = new Error('Invalid table name');
      validationError.name = 'ValidationException';
      mockDynamoDBClient.scan.mockRejectedValue(validationError);

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('validation');
      expect(body.error.retryable).toBe(false);
    });

    test('should handle server errors', async () => {
      const serverError = new Error('Internal server error');
      mockDynamoDBClient.scan.mockRejectedValue(serverError);

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.category).toBe('server_error');
      expect(body.error.retryable).toBe(true);
    });
  });

  describe('Performance and SLA', () => {
    test('should log warning when approaching 500ms SLA', async () => {
      // Mock a slow query
      mockDynamoDBClient.scan.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ Items: [], LastEvaluatedKey: undefined }), 450))
      );

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
      };

      const event = createTestEvent('POST', requestBody);
      await handler(event, mockContext, () => {});

      expect(consoleSpy).toHaveBeenCalledWith(
        'Tree query operation approaching SLA limit:',
        expect.objectContaining({
          slaWarning: true,
        })
      );

      consoleSpy.mockRestore();
    });

    test('should default limit to 100 for performance', async () => {
      mockDynamoDBClient.scan.mockResolvedValue({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/documents',
        // No limit specified
      };

      const event = createTestEvent('POST', requestBody);
      await handler(event, mockContext, () => {});

      expect(mockDynamoDBClient.scan).toHaveBeenCalledWith(
        expect.objectContaining({
          Limit: 100,
        })
      );
    });
  });

  describe('Data Structure Conversion', () => {
    test('should convert DynamoDB items to flat key-value pairs', async () => {
      const testItems = [
        { 
          id: 'test-workspace/users/john.json', 
          data: { name: 'John', role: 'admin' } 
        },
        { 
          id: 'test-workspace/users/jane.json', 
          data: { name: 'Jane', role: 'user' } 
        },
        { 
          id: 'test-workspace/settings/config.json', 
          data: { theme: 'dark', notifications: true } 
        },
      ];

      mockDynamoDBClient.scan.mockResolvedValue({
        Items: testItems,
        LastEvaluatedKey: undefined,
      });

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/users',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        '/users/john.json': { name: 'John', role: 'admin' },
        '/users/jane.json': { name: 'Jane', role: 'user' },
        '/settings/config.json': { theme: 'dark', notifications: true },
      });
    });

    test('should handle items without data field', async () => {
      const testItems = [
        { id: 'test-workspace/simple.txt', content: 'Simple content' },
      ];

      mockDynamoDBClient.scan.mockResolvedValue({
        Items: testItems,
        LastEvaluatedKey: undefined,
      });

      const requestBody = {
        workspaceId: 'test-workspace',
        pathPrefix: '/simple',
      };

      const event = createTestEvent('POST', requestBody);
      const result = await handler(event, mockContext, () => {});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.success).toBe(true);
      expect(body.data).toEqual({
        '/simple.txt': { id: 'test-workspace/simple.txt', content: 'Simple content' },
      });
    });
  });
});