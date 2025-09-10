# Data Read Lambda Function

This Lambda function provides read operations for the data infrastructure using DynamoDB with strong consistency, comprehensive error handling, and workspace validation.

## Features

- **DynamoDB GetItem operation** with strong consistency
- **Workspace validation** at Lambda level
- **Path format validation** with security checks
- **Error categorization** with proper HTTP status codes
- **Operation logging** for monitoring and debugging
- **Support for readWithDefault** operations with fallback values
- **CORS support** for cross-origin requests
- **AWS Lambda best practices** implementation

## API Specification

### Request Format

The function accepts both POST requests with JSON body and GET requests with query parameters.

#### POST Request (Recommended)
```json
{
  "workspaceId": "string",      // Required: Workspace identifier
  "path": "string",             // Required: Data path (must start with /)
  "userId": "string",           // Optional: User identifier for access control
  "defaultValue": "any",        // Optional: Default value for readWithDefault
  "operation": "read|readWithDefault"  // Optional: Operation type
}
```

#### GET Request
```
GET /read?workspaceId=workspace1&path=/data/path&userId=user123&defaultValue={"key":"value"}
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": "any",                // The retrieved data or default value
  "metadata": {
    "workspaceId": "string",
    "path": "string",
    "timestamp": "string",      // ISO timestamp
    "operation": "string",
    "found": boolean,           // Whether data was found in DB
    "defaultUsed": boolean      // Whether default value was used
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "string",           // Error code
    "message": "string",        // Human-readable error message
    "category": "validation|authorization|not_found|server_error|throttling",
    "retryable": boolean        // Whether the operation can be retried
  },
  "metadata": {
    "workspaceId": "string",
    "path": "string",
    "timestamp": "string",
    "operation": "string"
  }
}
```

## Operations

### Read Operation
Returns the data stored at the specified path. If no data is found, returns `null`.

```javascript
const response = await fetch('/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'my-workspace',
    path: '/session/data',
    operation: 'read'
  })
});
```

### Read with Default Operation
Returns the data stored at the specified path. If no data is found, returns the provided default value.

```javascript
const response = await fetch('/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'my-workspace',
    path: '/session/config',
    operation: 'readWithDefault',
    defaultValue: { theme: 'light', language: 'en' }
  })
});
```

## Validation Rules

### Workspace ID
- Must be alphanumeric with optional hyphens and underscores
- Length: 1-255 characters
- Pattern: `/^[a-zA-Z0-9_-]+$/`

### Path
- Must start with forward slash (`/`)
- Can contain alphanumeric characters, hyphens, underscores, and forward slashes
- Length: 1-1024 characters
- Pattern: `/^\/[a-zA-Z0-9_/-]*$/`

## Error Categories

### Validation Errors (400)
- Missing required fields (`workspaceId`, `path`)
- Invalid workspace ID format
- Invalid path format
- Invalid JSON in request body

### Authorization Errors (403)
- Invalid workspace access
- Workspace ID format violations
- User permission issues

### Not Found Errors (404)
- DynamoDB table not found
- Resource not found

### Throttling Errors (429)
- DynamoDB throttling
- Rate limit exceeded

### Server Errors (500)
- Internal server errors
- Database connection issues
- Unexpected errors

## Environment Variables

- `DYNAMODB_TABLE`: DynamoDB table name (default: `TreeChatData`)
- `AWS_REGION`: AWS region for DynamoDB
- `NODE_ENV`: Environment mode (`production`, `development`)

## DynamoDB Schema

The function expects data to be stored with the following key structure:

```
Primary Key: id (String)
Format: "{workspaceId}{path}"
Example: "my-workspace/session/data"
```

Data can be stored in two formats:
1. Direct format: The entire item is the data
2. Nested format: Data is stored in a `data` field within the item

## Performance Considerations

- **Strong Consistency**: All reads use `ConsistentRead: true`
- **Connection Reuse**: DynamoDB client connection is reused across Lambda invocations
- **Timeout Configuration**: 30-second request timeout with 5-second connection timeout
- **Retry Logic**: Exponential backoff with maximum 3 retries

## Monitoring and Logging

The function provides comprehensive logging for:
- Request parameters and validation
- DynamoDB operation details
- Response metadata
- Error information with stack traces
- Performance metrics (duration, consumed capacity)

## Security Features

- **Path Traversal Protection**: Strict path validation prevents directory traversal
- **Workspace Isolation**: Data is isolated by workspace ID
- **Input Sanitization**: All inputs are validated and sanitized
- **Error Information Limiting**: Error messages don't expose sensitive information

## Example Usage

### Reading Session Data
```javascript
// Read user session data
const response = await fetch('/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'user-123',
    path: '/session/current',
    userId: 'user-123'
  })
});

const result = await response.json();
if (result.success) {
  const sessionData = result.data;
  console.log('Session found:', result.metadata.found);
} else {
  console.error('Error:', result.error.message);
}
```

### Reading Configuration with Defaults
```javascript
// Read configuration with fallback defaults
const response = await fetch('/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: 'app-config',
    path: '/ui/settings',
    operation: 'readWithDefault',
    defaultValue: {
      theme: 'light',
      sidebar: 'collapsed',
      notifications: true
    }
  })
});

const result = await response.json();
const config = result.data; // Will always have a value
console.log('Using default:', result.metadata.defaultUsed);
```

## Testing

The function includes comprehensive unit tests covering:
- Request validation scenarios
- CORS handling
- Read operations (with and without defaults)
- Error handling for all error categories
- Query parameter parsing
- DynamoDB integration scenarios

Run tests with:
```bash
pnpm test
```