# Lambda Write Function

This module provides a production-ready Lambda function for write operations to the data infrastructure using DynamoDB.

## Features

- **DynamoDB PutItem** operations with audit trail metadata
- **Optimistic locking** for concurrent modifications using version numbers
- **Workspace validation** at Lambda level for security
- **Path format validation** and sanitization
- **Item size validation** against DynamoDB 400KB limit
- **Error categorization** with proper HTTP status codes
- **Operation logging** for monitoring and debugging
- **Nullable-first design** - supports storing null values
- **Audit tracking** - updatedAt, updatedBy, version metadata
- **Comprehensive testing** with 23 test cases covering all scenarios

## Request Format

### POST Request Body

```json
{
  "workspaceId": "your-workspace-id",
  "path": "/path/to/data",
  "value": { "any": "json-serializable-value" },
  "userId": "user-123",
  "operation": "write",
  "options": {
    "requireVersion": false,
    "expectedVersion": 5,
    "metadata": {
      "customKey": "customValue"
    }
  }
}
```

### Query Parameters (Alternative)

```
POST /data/write?workspaceId=test-workspace&path=/test/path&value={"test":"data"}&userId=user123
```

## Response Format

### Success Response (201 Created or 200 Updated)

```json
{
  "success": true,
  "data": {
    "value": { "your": "data" },
    "version": 1,
    "created": true
  },
  "metadata": {
    "workspaceId": "your-workspace-id",
    "path": "/path/to/data",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "operation": "write",
    "userId": "user-123",
    "itemSize": 156
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ValidationException",
    "message": "Invalid path format",
    "category": "validation",
    "retryable": false
  },
  "metadata": {
    "workspaceId": "your-workspace-id",
    "path": "/invalid-path",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "operation": "write",
    "userId": "user-123"
  }
}
```

## Usage Examples

### Basic Write Operation

```typescript
import { dataWriteHandler } from '@tree-chat/shared';

// Create Lambda event
const event = {
  httpMethod: 'POST',
  body: JSON.stringify({
    workspaceId: 'my-workspace',
    path: '/user/preferences',
    value: {
      theme: 'dark',
      language: 'en',
      notifications: true
    },
    userId: 'user-123'
  }),
  // ... other Lambda event properties
};

const response = await dataWriteHandler(event);
// Returns: { statusCode: 201, body: '{"success": true, ...}' }
```

### Update with Optimistic Locking

```typescript
const event = {
  httpMethod: 'POST',
  body: JSON.stringify({
    workspaceId: 'my-workspace',
    path: '/shared/document',
    value: {
      title: 'Updated Document',
      content: 'New content...',
      lastModified: '2024-01-01T12:00:00Z'
    },
    userId: 'user-123',
    options: {
      expectedVersion: 3  // Will fail if current version is not 3
    }
  }),
  // ... other properties
};
```

### Storing Null Values

```typescript
const event = {
  httpMethod: 'POST',
  body: JSON.stringify({
    workspaceId: 'my-workspace',
    path: '/user/avatar',
    value: null,  // Explicitly setting to null
    userId: 'user-123'
  })
};
```

## Error Categories

| Category | HTTP Status | Retryable | Description |
|----------|-------------|-----------|-------------|
| `validation` | 400 | No | Invalid input format, missing required fields |
| `authorization` | 403 | No | Access denied, invalid workspace |
| `conflict` | 409 | No | Version mismatch, optimistic locking failure |
| `size_limit` | 413 | No | Item exceeds DynamoDB 400KB limit |
| `throttling` | 429 | Yes | Rate limiting, provisioned throughput exceeded |
| `server_error` | 500 | Yes | Internal server or DynamoDB errors |

## Environment Variables

- `DYNAMODB_TABLE` - DynamoDB table name (default: 'TreeChatData')
- `NODE_ENV` - Environment mode (affects logging level)

## DynamoDB Item Structure

```json
{
  "id": "workspaceId/path/to/data",
  "data": { "your": "actual-data" },
  "version": 1,
  "workspaceId": "workspace-id",
  "path": "/path/to/data",
  "createdBy": "user-123",
  "updatedBy": "user-456",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "customKey": "customValue"
  }
}
```

## Testing

The module includes comprehensive tests covering:
- CORS handling
- Request parsing and validation
- Basic write operations (create/update)
- Optimistic locking scenarios
- Item size validation
- Error handling for all error categories
- Metadata and audit trail functionality
- Nullable-first design

Run tests:
```bash
npm test -- --testPathPattern="data-write"
```

## Integration with API Gateway

This Lambda function is designed to work with API Gateway:

1. **CORS Support** - Handles OPTIONS preflight requests
2. **Content-Type** - Expects `application/json`
3. **HTTP Methods** - Supports POST, PUT, OPTIONS
4. **Path Parameters** - Can extract workspaceId and path from URL
5. **Query Parameters** - Supports alternative parameter passing

## Monitoring and Logging

The function provides structured logging for:
- Operation start/completion with timing
- DynamoDB operation details
- Error conditions with stack traces
- Audit trail information
- Performance metrics

Use CloudWatch to monitor:
- Duration metrics
- Error rates by category
- DynamoDB consumed capacity
- Item size distributions