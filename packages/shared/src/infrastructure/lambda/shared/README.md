# Enhanced DynamoDB Client for Lambda Functions

A production-ready DynamoDB client with advanced features including connection pooling, retry logic, throttling handling, and performance optimizations.

## Features

- **Connection Pooling**: Optimized connection reuse with configurable pool size
- **Retry Logic**: Exponential backoff with jitter for failed requests
- **Throttling Handling**: Automatic detection and retry for throttling errors
- **Local Development**: Support for local DynamoDB (port 8000)
- **Tree Operations**: Specialized methods for hierarchical data structures
- **Batch Operations**: Automatic chunking for bulk operations
- **Transactions**: ACID transaction support
- **Health Checks**: Built-in health monitoring
- **Comprehensive Logging**: Detailed operation logging with performance metrics
- **Error Handling**: Robust error handling with specific error type detection

## Quick Start

### Basic Usage

```typescript
import { getDynamoDBClient } from '@tree-chat/shared/infrastructure/lambda/shared';

// Get singleton client instance
const dynamodb = getDynamoDBClient({
  enableLogging: true,
  maxRetries: 5,
});

// Basic CRUD operations
const item = await dynamodb.get({
  TableName: 'MyTable',
  Key: { id: '123' }
});

await dynamodb.put({
  TableName: 'MyTable',
  Item: { id: '123', name: 'John Doe' }
});
```

### Lambda Function Example

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDynamoDBClient } from '@tree-chat/shared/infrastructure/lambda/shared';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const dynamodb = getDynamoDBClient();
  
  try {
    const result = await dynamodb.get({
      TableName: process.env.TABLE_NAME!,
      Key: { id: event.pathParameters?.id }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## Configuration Options

```typescript
interface DynamoDBClientOptions {
  region?: string;                    // AWS region (default: us-east-1)
  local?: boolean;                    // Use local DynamoDB (default: false)
  localEndpoint?: string;             // Local endpoint (default: http://localhost:8000)
  maxRetries?: number;                // Max retry attempts (default: 3)
  maxSockets?: number;                // Connection pool size (default: 50)
  requestTimeout?: number;            // Request timeout ms (default: 30000)
  connectionTimeout?: number;         // Connection timeout ms (default: 5000)
  enableLogging?: boolean;            // Enable detailed logging (default: false)
}
```

## Environment Variables

The client respects the following environment variables:

- `AWS_REGION`: Default AWS region
- `NODE_ENV`: When set to 'development', enables local DynamoDB
- `DYNAMODB_LOCAL_ENDPOINT`: Local DynamoDB endpoint
- `DYNAMODB_MAX_RETRIES`: Maximum retry attempts
- `DYNAMODB_MAX_SOCKETS`: Connection pool size
- `DYNAMODB_REQUEST_TIMEOUT`: Request timeout in milliseconds
- `DYNAMODB_CONNECTION_TIMEOUT`: Connection timeout in milliseconds
- `DYNAMODB_ENABLE_LOGGING`: Enable detailed logging

## Advanced Features

### Tree Operations

For hierarchical data structures like chat conversation trees:

```typescript
// Read entire tree structure
const tree = await dynamodb.readTree('ChatTree', 'root-id', {
  maxDepth: 10,
  includeMetadata: true
});

console.log(tree.metadata.nodeCount); // Total nodes in tree
console.log(tree.metadata.depth);     // Maximum tree depth
```

### Batch Operations

Automatic chunking for large batch operations:

```typescript
const operations = [
  { type: 'put', tableName: 'MyTable', item: { id: '1', name: 'Item 1' } },
  { type: 'put', tableName: 'MyTable', item: { id: '2', name: 'Item 2' } },
  { type: 'delete', tableName: 'MyTable', key: { id: '3' } },
  // ... up to thousands of operations
];

const results = await dynamodb.batchOperations(operations);
```

### Transactions

ACID transactions for consistency:

```typescript
await dynamodb.transactWrite({
  TransactItems: [
    {
      Put: {
        TableName: 'Sessions',
        Item: { id: 'session-1', status: 'active' }
      }
    },
    {
      Update: {
        TableName: 'Users',
        Key: { id: 'user-1' },
        UpdateExpression: 'SET #sessionCount = #sessionCount + :inc',
        ExpressionAttributeNames: { '#sessionCount': 'sessionCount' },
        ExpressionAttributeValues: { ':inc': 1 }
      }
    }
  ]
});
```

### Health Checks

Monitor DynamoDB connectivity:

```typescript
const isHealthy = await dynamodb.healthCheck('MyTable');

if (!isHealthy) {
  console.error('DynamoDB is not accessible');
}
```

## Error Handling

The client provides comprehensive error handling:

```typescript
try {
  await dynamodb.get({ TableName: 'MyTable', Key: { id: '123' } });
} catch (error) {
  switch (error.name) {
    case 'ProvisionedThroughputExceededException':
      console.log('Request was throttled, will be retried');
      break;
    case 'ValidationException':
      console.log('Invalid request parameters');
      break;
    case 'ResourceNotFoundException':
      console.log('Table or item not found');
      break;
    case 'ConditionalCheckFailedException':
      console.log('Condition check failed');
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

## Performance Optimizations

The client includes several performance optimizations:

1. **Connection Pooling**: Reuses connections to reduce latency
2. **Retry Strategy**: Exponential backoff with jitter prevents thundering herd
3. **Request Marshalling**: Optimized marshalling options for better performance
4. **Timeout Configuration**: Configurable timeouts prevent hanging requests
5. **Logging**: Optional detailed logging for performance monitoring

## Local Development

For local development with DynamoDB Local:

```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Or using the client with local configuration
const dynamodb = getDynamoDBClient({
  local: true,
  localEndpoint: 'http://localhost:8000'
});
```

## Testing

The client includes comprehensive tests:

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Best Practices

1. **Use the Singleton**: Use `getDynamoDBClient()` to reuse connections
2. **Environment Configuration**: Configure via environment variables in production
3. **Error Handling**: Always handle specific DynamoDB errors
4. **Logging**: Enable logging in non-production environments for debugging
5. **Timeouts**: Set appropriate timeouts based on your use case
6. **Batch Operations**: Use batch operations for bulk data processing
7. **Transactions**: Use transactions for operations requiring consistency

## Migration Guide

If you're migrating from the standard AWS SDK:

```typescript
// Before (AWS SDK v3)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const result = await docClient.send(new GetCommand({ ... }));

// After (Enhanced Client)
import { getDynamoDBClient } from '@tree-chat/shared/infrastructure/lambda/shared';

const dynamodb = getDynamoDBClient();
const result = await dynamodb.get({ ... });
```

## API Reference

### Core Methods

- `get(params)` - Get single item
- `put(params)` - Put single item
- `update(params)` - Update single item
- `delete(params)` - Delete single item
- `query(params)` - Query items
- `scan(params)` - Scan items
- `batchGet(params)` - Batch get items
- `batchWrite(params)` - Batch write items
- `transactWrite(params)` - Transaction write
- `transactGet(params)` - Transaction get

### Enhanced Methods

- `readTree(tableName, rootId, options)` - Read tree structure
- `batchOperations(operations)` - Batch operations with chunking
- `healthCheck(tableName)` - Health check

### Utility Methods

- `getClient()` - Get underlying DynamoDB client
- `getDocumentClient()` - Get document client
- `destroy()` - Clean up connections