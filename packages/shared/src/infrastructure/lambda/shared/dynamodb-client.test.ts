import { EnhancedDynamoDBClient, getDynamoDBClient, resetDynamoDBClient } from './dynamodb-client';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('EnhancedDynamoDBClient', () => {
  let client: EnhancedDynamoDBClient;

  beforeEach(() => {
    resetDynamoDBClient();
  });

  afterEach(() => {
    if (client) {
      client.destroy();
    }
    resetDynamoDBClient();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      client = new EnhancedDynamoDBClient();
      expect(client).toBeInstanceOf(EnhancedDynamoDBClient);
    });

    it('should initialize with custom options', () => {
      client = new EnhancedDynamoDBClient({
        region: 'us-west-2',
        local: true,
        maxRetries: 5,
        enableLogging: true,
      });
      expect(client).toBeInstanceOf(EnhancedDynamoDBClient);
    });

    it('should configure for local DynamoDB when local=true', () => {
      client = new EnhancedDynamoDBClient({
        local: true,
        localEndpoint: 'http://localhost:8000',
      });
      expect(client).toBeInstanceOf(EnhancedDynamoDBClient);
    });
  });

  describe('CRUD operations', () => {
    beforeEach(() => {
      client = new EnhancedDynamoDBClient({ enableLogging: false });
    });

    it('should execute get operation', async () => {
      const mockResponse = { Item: { id: '123', name: 'test' } };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.get({
        TableName: 'TestTable',
        Key: { id: '123' },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute put operation', async () => {
      const mockResponse = {};
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.put({
        TableName: 'TestTable',
        Item: { id: '123', name: 'test' },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute update operation', async () => {
      const mockResponse = { Attributes: { id: '123', name: 'updated' } };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.update({
        TableName: 'TestTable',
        Key: { id: '123' },
        UpdateExpression: 'SET #name = :name',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':name': 'updated' },
        ReturnValues: 'ALL_NEW',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute delete operation', async () => {
      const mockResponse = {};
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.delete({
        TableName: 'TestTable',
        Key: { id: '123' },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute query operation', async () => {
      const mockResponse = { Items: [{ id: '123', name: 'test' }] };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.query({
        TableName: 'TestTable',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: { ':id': '123' },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute scan operation', async () => {
      const mockResponse = { Items: [{ id: '123', name: 'test' }] };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.scan({
        TableName: 'TestTable',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('batch operations', () => {
    beforeEach(() => {
      client = new EnhancedDynamoDBClient({ enableLogging: false });
    });

    it('should execute batch get operation', async () => {
      const mockResponse = { Responses: { TestTable: [{ id: '123', name: 'test' }] } };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.batchGet({
        RequestItems: {
          TestTable: {
            Keys: [{ id: '123' }],
          },
        },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute batch write operation', async () => {
      const mockResponse = {};
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.batchWrite({
        RequestItems: {
          TestTable: [
            {
              PutRequest: {
                Item: { id: '123', name: 'test' },
              },
            },
          ],
        },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle batch operations with chunking', async () => {
      const mockResponse = {};
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const operations = Array.from({ length: 50 }, (_, i) => ({
        type: 'put' as const,
        tableName: 'TestTable',
        item: { id: `${i}`, name: `test-${i}` },
      }));

      const results = await client.batchOperations(operations);

      // Should be called twice (25 items per batch)
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe('tree operations', () => {
    beforeEach(() => {
      client = new EnhancedDynamoDBClient({ enableLogging: false });
    });

    it('should read tree structure', async () => {
      const mockRootResponse = { Item: { id: 'root', name: 'Root Node' } };
      const mockQueryResponse = {
        Items: [
          { id: 'child1', parent: 'root', name: 'Child 1' },
          { id: 'child2', parent: 'root', name: 'Child 2' },
          { id: 'grandchild1', parent: 'child1', name: 'Grandchild 1' },
        ],
      };

      const mockSend = jest.fn()
        .mockResolvedValueOnce(mockRootResponse)
        .mockResolvedValueOnce(mockQueryResponse);

      client.getDocumentClient().send = mockSend;

      const result = await client.readTree('TestTable', 'root');

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('id', 'root');
      expect(result.children).toHaveLength(2);
      expect(result.children[0].children).toHaveLength(1);
    });

    it('should read tree structure with metadata', async () => {
      const mockRootResponse = { Item: { id: 'root', name: 'Root Node' } };
      const mockQueryResponse = { Items: [] };

      const mockSend = jest.fn()
        .mockResolvedValueOnce(mockRootResponse)
        .mockResolvedValueOnce(mockQueryResponse);

      client.getDocumentClient().send = mockSend;

      const result = await client.readTree('TestTable', 'root', {
        includeMetadata: true,
      });

      expect(result).toHaveProperty('tree');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('nodeCount');
      expect(result.metadata).toHaveProperty('depth');
      expect(result.metadata).toHaveProperty('rootId', 'root');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client = new EnhancedDynamoDBClient({ enableLogging: false });
    });

    it('should handle throttling errors', async () => {
      const throttlingError = {
        name: 'ProvisionedThroughputExceededException',
        message: 'Request rate is too high',
        $metadata: { httpStatusCode: 400 },
      };

      const mockSend = jest.fn().mockRejectedValue(throttlingError);
      client.getDocumentClient().send = mockSend;

      await expect(client.get({
        TableName: 'TestTable',
        Key: { id: '123' },
      })).rejects.toThrow('Request rate is too high');
    });

    it('should handle validation errors', async () => {
      const validationError = {
        name: 'ValidationException',
        message: 'Invalid parameter',
        $metadata: { httpStatusCode: 400 },
      };

      const mockSend = jest.fn().mockRejectedValue(validationError);
      client.getDocumentClient().send = mockSend;

      await expect(client.put({
        TableName: 'TestTable',
        Item: { id: '123' },
      })).rejects.toThrow('Invalid parameter');
    });

    it('should handle resource not found errors', async () => {
      const notFoundError = {
        name: 'ResourceNotFoundException',
        message: 'Table not found',
        $metadata: { httpStatusCode: 400 },
      };

      const mockSend = jest.fn().mockRejectedValue(notFoundError);
      client.getDocumentClient().send = mockSend;

      await expect(client.get({
        TableName: 'NonExistentTable',
        Key: { id: '123' },
      })).rejects.toThrow('Table not found');
    });
  });

  describe('transaction operations', () => {
    beforeEach(() => {
      client = new EnhancedDynamoDBClient({ enableLogging: false });
    });

    it('should execute transact write operation', async () => {
      const mockResponse = {};
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.transactWrite({
        TransactItems: [
          {
            Put: {
              TableName: 'TestTable',
              Item: { id: '123', name: 'test' },
            },
          },
        ],
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should execute transact get operation', async () => {
      const mockResponse = {
        Responses: [
          { Item: { id: '123', name: 'test' } },
        ],
      };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.transactGet({
        TransactItems: [
          {
            Get: {
              TableName: 'TestTable',
              Key: { id: '123' },
            },
          },
        ],
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('health check', () => {
    beforeEach(() => {
      client = new EnhancedDynamoDBClient({ enableLogging: false });
    });

    it('should pass health check when table is accessible', async () => {
      const mockResponse = { Items: [] };
      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      client.getDocumentClient().send = mockSend;

      const result = await client.healthCheck('TestTable');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should fail health check when table is not accessible', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Table not found'));
      client.getDocumentClient().send = mockSend;

      const result = await client.healthCheck('TestTable');

      expect(result).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance for getDynamoDBClient', () => {
      const client1 = getDynamoDBClient();
      const client2 = getDynamoDBClient();

      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getDynamoDBClient();
      resetDynamoDBClient();
      const client2 = getDynamoDBClient();

      expect(client1).not.toBe(client2);
    });
  });
});