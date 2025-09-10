# Data API Routes

RESTful HTTP API for the Tree Chat data infrastructure. These routes provide secure, authenticated access to hierarchical data storage with full workspace isolation and comprehensive validation.

## Overview

The Data API provides five main operations:

- **`/api/data/read`** - Read a single value from a hierarchical path
- **`/api/data/write`** - Write a value to a hierarchical path
- **`/api/data/readTree`** - Query hierarchical data structures
- **`/api/data/readWithDefault`** - Read with fallback default values
- **`/api/data/batch`** - Perform atomic batch operations

All routes require Clerk authentication and enforce workspace-level access control.

## Authentication

All endpoints require authentication via Clerk. The API automatically extracts:

- **`userId`** - From the authenticated Clerk session
- **`orgId`** - From the Clerk organization context (used as `workspaceId`)

### Headers

```http
Authorization: Bearer <clerk-session-token>
Content-Type: application/json
```

### Workspace Access

Users can only access data within their current organization context. The API automatically validates that the requested `workspaceId` matches the user's current `orgId`.

## API Endpoints

### 1. Read Data

Retrieves a single value from the hierarchical data store.

**Endpoint:** `POST /api/data/read`

**Request Body:**
```json
{
  "workspaceId": "org_2abc123def456",
  "path": "/user/settings"
}
```

**Success Response (200):**
```json
{
  "data": {
    "theme": "dark",
    "notifications": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Data Not Found (200):**
```json
{
  "data": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401` - Authentication required
- `403` - Workspace access denied
- `400` - Invalid request parameters
- `500` - Internal server error

**Usage Examples:**

```typescript
// JavaScript/TypeScript client
async function readUserSettings(workspaceId: string) {
  const response = await fetch('/api/data/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      path: '/user/settings'
    })
  })
  
  const result = await response.json()
  return result.data // null if not found
}
```

```bash
# cURL example
curl -X POST /api/data/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-token>" \
  -d '{
    "workspaceId": "org_2abc123def456",
    "path": "/user/profile"
  }'
```

### 2. Write Data

Stores a value at the specified hierarchical path. Supports null values, objects, arrays, and primitives.

**Endpoint:** `POST /api/data/write`

**Request Body:**
```json
{
  "workspaceId": "org_2abc123def456",
  "path": "/user/settings",
  "value": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Writing Null Values:**
```json
{
  "workspaceId": "org_2abc123def456",
  "path": "/user/temporary_data",
  "value": null
}
```

**Usage Examples:**

```typescript
// Update user preferences
async function updateUserPreferences(workspaceId: string, preferences: any) {
  const response = await fetch('/api/data/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      path: '/user/preferences',
      value: preferences
    })
  })
  
  if (!response.ok) {
    throw new Error(`Write failed: ${response.status}`)
  }
  
  return await response.json()
}

// Delete data by writing null
async function deleteUserData(workspaceId: string, path: string) {
  await fetch('/api/data/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      path,
      value: null
    })
  })
}
```

### 3. Read Tree

Queries hierarchical data structures using path prefixes. Returns all items that begin with the specified path.

**Endpoint:** `POST /api/data/readTree`

**Request Body:**
```json
{
  "workspaceId": "org_2abc123def456",
  "pathPrefix": "/user"
}
```

**Success Response (200):**
```json
{
  "items": {
    "/user/settings": {
      "theme": "dark",
      "notifications": true
    },
    "/user/profile": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "/user/preferences/language": "en-US"
  },
  "totalCount": 3,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Empty Result (200):**
```json
{
  "items": {},
  "totalCount": 0,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Usage Examples:**

```typescript
// Get all user data
async function getAllUserData(workspaceId: string) {
  const response = await fetch('/api/data/readTree', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      pathPrefix: '/user'
    })
  })
  
  const result = await response.json()
  return result.items
}

// Get project files
async function getProjectFiles(workspaceId: string, projectId: string) {
  const response = await fetch('/api/data/readTree', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      pathPrefix: `/projects/${projectId}/files`
    })
  })
  
  return await response.json()
}
```

### 4. Read With Default

Reads a value from a path, returning a default value if the data doesn't exist.

**Endpoint:** `POST /api/data/readWithDefault`

**Request Body:**
```json
{
  "workspaceId": "org_2abc123def456",
  "path": "/user/settings",
  "defaultValue": {
    "theme": "light",
    "notifications": false
  }
}
```

**Success Response (200):**
```json
{
  "data": {
    "theme": "dark",
    "notifications": true
  },
  "wasDefault": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Using Default Value (200):**
```json
{
  "data": {
    "theme": "light",
    "notifications": false
  },
  "wasDefault": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Usage Examples:**

```typescript
// Get settings with defaults
async function getUserSettings(workspaceId: string) {
  const response = await fetch('/api/data/readWithDefault', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      path: '/user/settings',
      defaultValue: {
        theme: 'light',
        notifications: true,
        language: 'en-US'
      }
    })
  })
  
  const result = await response.json()
  
  if (result.wasDefault) {
    console.log('Using default settings')
  }
  
  return result.data
}
```

### 5. Batch Operations

Performs multiple operations atomically. All operations succeed or all fail (transaction behavior).

**Endpoint:** `POST /api/data/batch`

**Request Body:**
```json
{
  "workspaceId": "org_2abc123def456",
  "operations": [
    {
      "type": "write",
      "path": "/user/name",
      "value": "John Doe"
    },
    {
      "type": "write",
      "path": "/user/updated_at",
      "value": "2024-01-15T10:30:00.000Z"
    },
    {
      "type": "read",
      "path": "/user/id"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "results": [
    {
      "type": "write",
      "path": "/user/name",
      "success": true
    },
    {
      "type": "write", 
      "path": "/user/updated_at",
      "success": true
    },
    {
      "type": "read",
      "path": "/user/id",
      "data": "user_12345",
      "success": true
    }
  ],
  "totalOperations": 3,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Usage Examples:**

```typescript
// Atomic user profile update
async function updateUserProfile(workspaceId: string, profileData: any) {
  const operations = [
    {
      type: 'write',
      path: '/user/profile',
      value: profileData
    },
    {
      type: 'write',
      path: '/user/last_updated',
      value: new Date().toISOString()
    },
    {
      type: 'read',
      path: '/user/version'
    }
  ]
  
  const response = await fetch('/api/data/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId,
      operations
    })
  })
  
  const result = await response.json()
  return result.results
}

// Multi-step data migration
async function migrateUserData(workspaceId: string, oldPath: string, newPath: string) {
  const operations = [
    { type: 'read', path: oldPath },
    { type: 'write', path: newPath, value: null }, // Will be updated with read result
    { type: 'write', path: oldPath, value: null }   // Delete old data
  ]
  
  // First, read the old data
  const readResult = await fetch('/api/data/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, path: oldPath })
  })
  
  const oldData = (await readResult.json()).data
  
  if (oldData !== null) {
    // Update the batch operations with the actual data
    operations[1].value = oldData
    
    // Execute the batch
    const response = await fetch('/api/data/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, operations })
    })
    
    return await response.json()
  }
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message describing the issue",
  "code": "ERROR_CODE", // Optional: Machine-readable error code
  "details": {}         // Optional: Additional error details
}
```

### Common Error Codes

#### Authentication Errors (401)
```json
{
  "error": "Authentication required"
}
```

#### Authorization Errors (403)
```json
{
  "error": "Workspace context required"
}
```

```json
{
  "error": "Access denied to workspace"
}
```

#### Validation Errors (400)
```json
{
  "error": "Invalid workspaceId parameter"
}
```

```json
{
  "error": "Path must start with /"
}
```

```json
{
  "error": "Invalid data path format"
}
```

#### Server Errors (500)
```json
{
  "error": "Internal server error"
}
```

#### Timeout Errors (504)
```json
{
  "error": "Operation timed out"
}
```

### Error Handling Best Practices

```typescript
async function handleApiCall(apiCall: () => Promise<Response>) {
  try {
    const response = await apiCall()
    
    if (!response.ok) {
      const error = await response.json()
      
      switch (response.status) {
        case 401:
          // Handle authentication errors
          console.error('Authentication required')
          // Redirect to login or refresh token
          break
          
        case 403:
          // Handle authorization errors
          console.error('Access denied:', error.error)
          // Show access denied message
          break
          
        case 400:
          // Handle validation errors
          console.error('Invalid request:', error.error)
          // Show user-friendly validation message
          break
          
        case 500:
        case 504:
          // Handle server errors
          console.error('Server error:', error.error)
          // Show retry option or fallback
          break
          
        default:
          console.error('Unexpected error:', error.error)
      }
      
      throw new Error(error.error)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}
```

## Path Conventions

### Hierarchical Path Structure

Paths should follow a hierarchical structure that reflects your data organization:

```
/user/profile          // User profile data
/user/settings/theme   // Nested settings
/projects/123/files    // Project-specific data
/workspace/config      // Workspace-level configuration
```

### Path Best Practices

1. **Start with forward slash**: All paths must begin with `/`
2. **Use descriptive names**: Make paths self-documenting
3. **Group related data**: Use hierarchical organization
4. **Avoid deep nesting**: Keep reasonable depth (< 10 levels)
5. **Use consistent naming**: snake_case or camelCase consistently

### Reserved Paths

Certain path prefixes are reserved for system use:

- `/system/` - System configuration and metadata
- `/internal/` - Internal application state
- `/temp/` - Temporary data (may be auto-cleaned)

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Read operations**: 1000 requests per minute per user
- **Write operations**: 500 requests per minute per user
- **Batch operations**: 100 requests per minute per user
- **Tree queries**: 200 requests per minute per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642345678
```

## Performance Considerations

### Response Times

Target response times for operations:

- **Single reads**: < 200ms (95th percentile)
- **Single writes**: < 200ms (95th percentile)
- **Tree queries**: < 500ms for up to 1000 items
- **Batch operations**: < 200ms for up to 25 operations

### Optimization Tips

1. **Batch related operations** - Use batch endpoint for multiple operations
2. **Limit tree query scope** - Use specific path prefixes
3. **Cache frequently read data** - Implement client-side caching
4. **Use readWithDefault** - Reduces roundtrips for missing data

## Security Features

### Workspace Isolation

- Complete data segregation between workspaces
- Automatic workspace validation based on user's organization context
- No cross-workspace data access possible

### Input Validation

- Path format validation (must start with `/`)
- Path length limits (1KB maximum)
- Character restrictions for security
- JSON payload validation

### Audit Logging

All operations are logged for audit purposes:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "user_12345",
  "workspaceId": "org_2abc123def456",
  "operation": "write",
  "path": "/user/settings",
  "success": true,
  "responseTime": "125ms"
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Data client configuration
DATA_LAMBDA_ENDPOINT=https://your-lambda-endpoint.amazonaws.com
DATA_API_KEY=your-api-key

# Optional configuration
DATA_CLIENT_TIMEOUT=10000
DATA_CLIENT_MAX_RETRIES=3
```

### Clerk Configuration

```bash
# Clerk authentication (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## React Integration

### Custom Hooks

The API is typically accessed through React hooks that provide caching and state management:

```typescript
import { useRead, useWrite, useBatch } from '@/hooks/data'

function UserProfile() {
  const { data: profile, loading, error } = useRead('/user/profile')
  const { write: updateProfile, loading: saving } = useWrite()
  
  const handleSave = async (newProfile: any) => {
    try {
      await updateProfile('/user/profile', newProfile)
      console.log('Profile saved successfully')
    } catch (error) {
      console.error('Save failed:', error)
    }
  }
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <h1>{profile?.name || 'Anonymous'}</h1>
      {/* Profile form */}
    </div>
  )
}
```

## Testing

### Unit Test Examples

```typescript
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn()
}))

describe('/api/data/read', () => {
  test('should return data when found', async () => {
    // Mock authenticated user
    ;(auth as jest.Mock).mockResolvedValue({
      userId: 'user_123',
      orgId: 'org_456'
    })
    
    const request = new NextRequest('http://localhost/api/data/read', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'org_456',
        path: '/user/settings'
      })
    })
    
    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const result = await response.json()
    expect(result.data).toBeDefined()
    expect(result.timestamp).toBeDefined()
  })
  
  test('should return 401 for unauthenticated requests', async () => {
    ;(auth as jest.Mock).mockResolvedValue({
      userId: null,
      orgId: null
    })
    
    const request = new NextRequest('http://localhost/api/data/read', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId: 'org_456',
        path: '/user/settings'
      })
    })
    
    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
```

### Integration Tests

```bash
# Run API integration tests
pnpm test:api

# Run specific route tests
pnpm test apps/web/src/app/api/data
```

## Monitoring and Observability

### Metrics

Key metrics tracked by the API:

- Request rate per endpoint
- Response times (p50, p95, p99)
- Error rates by status code
- Workspace usage patterns
- Data size distributions

### Logging

Structured logging with context:

```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "Data read operation",
  "userId": "user_12345",
  "workspaceId": "org_456",
  "path": "/user/settings",
  "duration": "125ms",
  "success": true
}
```

## Migration Guide

### From Direct Database Access

Before:
```typescript
// Direct database queries
const user = await db.users.findById(userId)
const settings = user.settings
```

After:
```typescript
// API-based access
const response = await fetch('/api/data/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspaceId: currentWorkspace,
    path: '/user/settings'
  })
})
const { data: settings } = await response.json()
```

### Benefits

- **Workspace isolation** - Automatic data segregation
- **Type safety** - Full TypeScript support
- **Caching** - Built-in response caching
- **Validation** - Comprehensive input validation
- **Audit logging** - Complete operation tracking
- **Error handling** - Consistent error responses

## Related Documentation

- **[Data Client Package](../../../packages/data-client/README.md)** - Underlying client implementation
- **[React Hooks](../../hooks/data/README.md)** - Frontend data access hooks
- **[Shared Types](../../../packages/shared/README.md)** - Type definitions
- **[Data Provider](../../providers/data/README.md)** - React context integration