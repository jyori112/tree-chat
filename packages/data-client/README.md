# @tree-chat/data-client

Production-ready data access client for the Tree Chat application. This package provides a robust, type-safe interface for data operations backed by AWS Lambda functions and DynamoDB, with comprehensive validation, workspace isolation, and enterprise-grade error handling.

## Overview

The data-client package implements the `DataClient` interface defined in `@tree-chat/shared` with:

- **Lambda-based backend** - Serverless AWS Lambda functions for scalable data operations
- **Workspace isolation** - Complete data segregation between workspaces
- **Comprehensive validation** - Path validation, Unicode support, security constraints
- **Production-ready reliability** - Exponential backoff, error categorization, audit logging
- **Type safety** - Full TypeScript support with strict type checking
- **Nullable-first design** - Explicit null handling throughout the API

## Installation

```bash
pnpm install @tree-chat/data-client
```

This package depends on `@tree-chat/shared` which will be installed automatically in the monorepo.

## Quick Start

### Basic Usage

```typescript
import { LambdaDataClient, createLambdaClient } from '@tree-chat/data-client'

// Create a client instance
const client = createLambdaClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!,
  region: 'us-east-1',
  enableRetries: true,
  maxRetries: 3,
  timeoutMs: 30000
})

// Basic read operation
const response = await client.read('workspace_123', '/user/settings', 'user_456')
if (response.exists) {
  console.log('User settings:', response.value)
} else {
  console.log('No settings found')
}

// Write operation
await client.write('workspace_123', '/user/settings', { theme: 'dark' }, 'user_456')

// Tree query
const tree = await client.readTree('workspace_123', '/user', 'user_456')
console.log('User data tree:', tree.items)
```

### Advanced Usage

```typescript
import { LambdaDataClient, BatchOperation } from '@tree-chat/data-client'

const client = new LambdaDataClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!,
  region: 'us-east-1',
  enableAuditLogging: true,
  enableRetries: true,
  maxRetries: 3,
  retryBackoffMs: 1000,
  timeoutMs: 30000,
  enableConnectionPooling: true,
  maxConcurrentConnections: 50
})

// Batch operations for atomic transactions
const operations: BatchOperation[] = [
  { type: 'write', path: '/user/profile', value: { name: 'John Doe' } },
  { type: 'write', path: '/user/preferences', value: { notifications: true } },
  { type: 'read', path: '/user/settings' }
]

const results = await client.batch('workspace_123', operations, 'user_456')
results.forEach((result, index) => {
  console.log(`Operation ${index}:`, result)
})
```

## Package Structure

```
packages/data-client/
├── src/
│   ├── index.ts                  # Main exports and re-exports
│   ├── lambda-client.ts          # Core Lambda client implementation
│   ├── validation.ts             # Path and value validation
│   ├── workspace-validator.ts    # Workspace security validation
│   ├── clients/
│   │   └── index.ts             # Client factory functions
│   ├── types/
│   │   └── index.ts             # Additional type definitions
│   └── utils/
│       └── index.ts             # Utility functions
├── tests/
│   ├── unit/                    # Unit tests
│   └── setup.ts                 # Test configuration
├── dist/                        # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Core Features

### 1. Lambda Data Client

The main `LambdaDataClient` class provides all CRUD operations:

#### Read Operations

```typescript
// Single item read
const response = await client.read(workspaceId, '/user/profile', userId)
console.log('Exists:', response.exists)
console.log('Value:', response.value)  // null if not found
console.log('Last modified:', response.lastModified)

// Read with default value
const settings = await client.readWithDefault(
  workspaceId, 
  '/user/settings', 
  { theme: 'light', notifications: true }, 
  userId
)
console.log('Settings with defaults:', settings.value)

// Tree query (hierarchical data)
const userTree = await client.readTree(workspaceId, '/user', userId)
console.log('Tree structure:', userTree.items)
console.log('Total items:', userTree.totalCount)
```

#### Write Operations

```typescript
// Simple write
await client.write(workspaceId, '/user/profile', { name: 'John' }, userId)

// Write with null (explicit deletion)
await client.write(workspaceId, '/user/temp_data', null, userId)

// Batch atomic operations
const operations = [
  { type: 'write', path: '/user/name', value: 'John Doe' },
  { type: 'write', path: '/user/email', value: 'john@example.com' },
  { type: 'read', path: '/user/id' }
]

const results = await client.batch(workspaceId, operations, userId)
```

### 2. Validation System

Comprehensive input validation with security focus:

#### Path Validation

```typescript
import { validatePath } from '@tree-chat/data-client'

const validation = validatePath('/user/settings')
if (validation.isValid) {
  console.log('Validated path:', validation.validatedPath)
} else {
  console.error('Validation errors:', validation.errors)
}

// Advanced validation with options
const result = validatePath('/user/files/document.pdf', {
  maxLength: 512,
  allowUnicode: true,
  preventTraversal: true,
  allowedExtensions: ['.pdf', '.doc', '.txt']
})
```

#### Security Features

- **Path traversal prevention** - Blocks `../` and similar patterns
- **Length validation** - Enforces DynamoDB 1KB path limits
- **Character restrictions** - Prevents dangerous characters
- **Unicode support** - Proper international character handling

### 3. Workspace Isolation

Complete data segregation between workspaces:

```typescript
import { validateWorkspaceAccess } from '@tree-chat/data-client'

// Workspace validation
const accessResult = await validateWorkspaceAccess({
  workspaceId: 'workspace_123',
  userId: 'user_456',
  operation: 'read',
  path: '/sensitive/data'
})

if (!accessResult.hasAccess) {
  throw new Error(`Access denied: ${accessResult.reason}`)
}
```

### 4. Error Handling

Production-ready error management:

```typescript
import { DataAccessError, isRetryableError } from '@tree-chat/data-client'

try {
  await client.read(workspaceId, '/user/data', userId)
} catch (error) {
  if (error instanceof DataAccessError) {
    console.log('Error code:', error.code)
    console.log('Category:', error.category)
    console.log('Retryable:', isRetryableError(error))
    
    // Handle specific error types
    switch (error.code) {
      case 'WORKSPACE_NOT_FOUND':
        // Handle workspace issues
        break
      case 'PATH_VALIDATION_FAILED':
        // Handle validation errors
        break
      case 'LAMBDA_TIMEOUT':
        // Handle timeout errors
        break
    }
  }
}
```

## Configuration

### LambdaClientConfig

```typescript
interface LambdaClientConfig {
  // Required: Lambda endpoint URL
  lambdaEndpoint: string
  
  // AWS configuration
  region?: string                     // Default: 'us-east-1'
  
  // Retry configuration
  enableRetries?: boolean             // Default: true
  maxRetries?: number                 // Default: 3
  retryBackoffMs?: number            // Default: 1000
  
  // Performance settings
  timeoutMs?: number                  // Default: 30000
  enableConnectionPooling?: boolean   // Default: true
  maxConcurrentConnections?: number   // Default: 50
  
  // Security and auditing
  enableAuditLogging?: boolean        // Default: false
  auditLogLevel?: 'info' | 'debug'   // Default: 'info'
  
  // Validation settings
  validation?: {
    maxPathLength?: number            // Default: 1024
    allowUnicode?: boolean           // Default: true
    restrictedCharacters?: string[]   // Custom restrictions
  }
}
```

### Environment Variables

The client automatically reads these environment variables:

```bash
# Required
DATA_LAMBDA_ENDPOINT=https://your-lambda-endpoint.amazonaws.com

# Optional
AWS_REGION=us-east-1
DATA_CLIENT_TIMEOUT=30000
DATA_CLIENT_MAX_RETRIES=3
DATA_CLIENT_ENABLE_AUDIT=true
```

## Performance Characteristics

### SLA Targets

- **Single reads**: 200ms p95 latency
- **Tree queries**: 500ms for up to 1000 items
- **Batch operations**: 200ms p95 for up to 25 items
- **Concurrent operations**: 100 operations per workspace

### Optimization Features

- **Connection pooling** - Reuses HTTP connections
- **Exponential backoff** - Handles temporary failures gracefully
- **Request batching** - Combines multiple operations efficiently
- **Caching hints** - Provides cache-friendly response metadata

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Example Test

```typescript
import { LambdaDataClient } from '@tree-chat/data-client'

describe('LambdaDataClient', () => {
  let client: LambdaDataClient

  beforeEach(() => {
    client = new LambdaDataClient({
      lambdaEndpoint: 'https://test.example.com'
    })
  })

  test('should read data successfully', async () => {
    // Mock Lambda response
    const mockResponse = { exists: true, value: { test: 'data' } }
    
    const result = await client.read('ws_123', '/test/path', 'user_456')
    expect(result.exists).toBe(true)
    expect(result.value).toEqual({ test: 'data' })
  })
})
```

## Integration Examples

### React Integration

```typescript
// Hook example using the data client
import { LambdaDataClient } from '@tree-chat/data-client'
import { useQuery } from '@tanstack/react-query'

const dataClient = new LambdaDataClient({
  lambdaEndpoint: process.env.NEXT_PUBLIC_DATA_ENDPOINT!
})

function useUserData(workspaceId: string, userId: string) {
  return useQuery({
    queryKey: ['user-data', workspaceId, userId],
    queryFn: () => dataClient.read(workspaceId, '/user/profile', userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      return isRetryableError(error) && failureCount < 3
    }
  })
}
```

### API Route Integration

```typescript
// Next.js API route example
import { LambdaDataClient } from '@tree-chat/data-client'
import { auth } from '@clerk/nextjs/server'

const dataClient = new LambdaDataClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!
})

export async function POST(request: Request) {
  const { userId, sessionClaims } = auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  const workspaceId = sessionClaims?.workspace_id as string
  const { path } = await request.json()
  
  try {
    const result = await dataClient.read(workspaceId, path, userId)
    return Response.json(result)
  } catch (error) {
    if (error instanceof DataAccessError) {
      return Response.json(
        { error: error.message }, 
        { status: error.category === 'client' ? 400 : 500 }
      )
    }
    throw error
  }
}
```

## Best Practices

### 1. Path Design

```typescript
// Good: Hierarchical, readable paths
'/user/profile/personal'
'/workspace/settings/notifications'
'/project/docs/readme'

// Avoid: Flat, unclear paths
'/user_profile_personal'
'/ws_settings_notifs'
'/proj_doc_readme'
```

### 2. Error Handling

```typescript
// Comprehensive error handling
try {
  const result = await client.read(workspaceId, path, userId)
  return result.value
} catch (error) {
  if (error instanceof DataAccessError) {
    // Log the error with context
    console.error('Data access failed:', {
      operation: 'read',
      workspaceId,
      path,
      userId,
      error: error.message,
      code: error.code
    })
    
    // Return appropriate response based on error type
    if (error.category === 'client') {
      throw new Error('Invalid request parameters')
    } else {
      throw new Error('Service temporarily unavailable')
    }
  }
  throw error // Re-throw unexpected errors
}
```

### 3. Batch Operations

```typescript
// Efficient batch operations
const operations = [
  { type: 'write', path: '/user/name', value: newName },
  { type: 'write', path: '/user/updated_at', value: new Date().toISOString() },
  { type: 'read', path: '/user/version' }  // Get current version for optimistic locking
]

const results = await client.batch(workspaceId, operations, userId)
```

### 4. Workspace Isolation

```typescript
// Always validate workspace access
async function secureDataAccess(workspaceId: string, path: string, userId: string) {
  // Validate workspace membership first
  const hasAccess = await validateWorkspaceAccess({
    workspaceId,
    userId,
    operation: 'read',
    path
  })
  
  if (!hasAccess.hasAccess) {
    throw new Error(`Access denied: ${hasAccess.reason}`)
  }
  
  // Proceed with data operation
  return await client.read(workspaceId, path, userId)
}
```

## Troubleshooting

### Common Issues

#### Lambda Timeouts

```typescript
// Increase timeout for heavy operations
const client = new LambdaDataClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!,
  timeoutMs: 60000  // 60 seconds for heavy queries
})
```

#### Connection Pool Exhaustion

```typescript
// Adjust connection pool settings
const client = new LambdaDataClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!,
  maxConcurrentConnections: 100,  // Increase if needed
  enableConnectionPooling: true
})
```

#### Validation Errors

```typescript
// Check path validation before operations
import { validatePath } from '@tree-chat/data-client'

const validation = validatePath(userPath)
if (!validation.isValid) {
  console.error('Path validation failed:', validation.errors)
  // Handle validation errors appropriately
}
```

### Debug Mode

```typescript
// Enable verbose logging for debugging
const client = new LambdaDataClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!,
  enableAuditLogging: true,
  auditLogLevel: 'debug'
})
```

## Migration Guide

### From Direct Lambda Calls

Before:
```typescript
// Direct Lambda invocation
const lambda = new AWS.Lambda()
const result = await lambda.invoke({
  FunctionName: 'data-read',
  Payload: JSON.stringify({ workspaceId, path, userId })
}).promise()
```

After:
```typescript
// Using data client
const client = new LambdaDataClient({
  lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!
})
const result = await client.read(workspaceId, path, userId)
```

### Benefits of Migration

- **Type safety** - Full TypeScript support
- **Error handling** - Comprehensive error categorization
- **Retry logic** - Automatic retry with exponential backoff
- **Validation** - Built-in path and value validation
- **Connection pooling** - Better performance
- **Audit logging** - Built-in operation tracking

## Contributing

### Adding New Operations

1. Extend the `DataClient` interface in `@tree-chat/shared`
2. Implement the method in `LambdaDataClient`
3. Add validation logic if needed
4. Write comprehensive tests
5. Update this documentation

### Code Standards

- Follow existing TypeScript patterns
- Include comprehensive JSDoc comments
- Add unit tests for all new functionality
- Follow nullable-first design principles
- Ensure workspace isolation compliance

## Related Documentation

- **[Shared Types](../shared/README.md)** - Core interfaces and types
- **[API Routes](../../apps/web/src/app/api/data/README.md)** - HTTP API built on this client
- **[React Hooks](../../apps/web/src/hooks/data/README.md)** - Frontend data access hooks
- **[Data Provider](../../apps/web/src/providers/data/README.md)** - React context provider