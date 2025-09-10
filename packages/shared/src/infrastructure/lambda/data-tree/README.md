# Data Tree Query Lambda Function

This Lambda function provides hierarchical tree query operations for the data infrastructure using DynamoDB. It implements Task 32 from the specification.

## Features

- **Tree Query Operations**: Efficient querying of tree structures with `begins_with` condition on path prefixes
- **Pagination Support**: Handle large datasets with proper pagination (up to 1000 items efficiently)
- **Performance Optimized**: Designed for 500ms SLA requirement with monitoring and warnings
- **Workspace Validation**: Secure workspace access control and path prefix validation
- **Empty Result Handling**: Properly returns `{}` (not null) for empty result sets
- **Comprehensive Error Handling**: Categorized errors with proper HTTP status codes
- **Monitoring & Logging**: Detailed logging for operations and performance tracking

## API Interface

### Request Format

**POST /tree-query**
```json
{
  "workspaceId": "workspace-123",
  "pathPrefix": "/documents",
  "userId": "user-456",
  "limit": 100,
  "lastKey": "...",
  "includeMetadata": false
}
```

**GET /tree-query?workspaceId=workspace-123&pathPrefix=/documents&limit=100**

### Response Format

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "/documents/file1.txt": { "content": "File 1 data" },
    "/documents/file2.txt": { "content": "File 2 data" },
    "/documents/subdir/file3.txt": { "content": "File 3 data" }
  },
  "metadata": {
    "workspaceId": "workspace-123",
    "pathPrefix": "/documents",
    "timestamp": "2024-09-10T18:00:00.000Z",
    "operation": "readTree",
    "itemCount": 3,
    "hasMore": false,
    "lastKey": null,
    "duration": "150ms"
  }
}
```

**Error Response (400/403/429/500)**
```json
{
  "success": false,
  "error": {
    "code": "ValidationException",
    "message": "Invalid path prefix format",
    "category": "validation",
    "retryable": false
  },
  "metadata": {
    "workspaceId": "workspace-123",
    "pathPrefix": "/invalid-path",
    "timestamp": "2024-09-10T18:00:00.000Z",
    "operation": "readTree"
  }
}
```

## Implementation Details

### DynamoDB Operations

The function uses DynamoDB **Scan** operation with **FilterExpression** for `begins_with` queries:

```javascript
{
  TableName: "TreeChatData",
  FilterExpression: "begins_with(id, :pathPrefix)",
  ExpressionAttributeValues: {
    ":pathPrefix": "workspace-123/documents"
  },
  Limit: 100,
  ConsistentRead: false
}
```

### Performance Considerations

**Current Implementation**: Uses Scan with FilterExpression
- **Pros**: Simple implementation, works with any path prefix
- **Cons**: Can be slower for large datasets (scans entire table)

**Production Optimizations** (for better 500ms SLA):
1. **GSI Optimization**: Add Global Secondary Index with path as partition key
2. **Parallel Scanning**: Use multiple scan segments for large tables  
3. **Workspace Tables**: Separate tables per workspace to reduce scan scope
4. **DAX Caching**: Use DynamoDB Accelerator for frequent queries

### Data Structure

The function returns hierarchical data as **flat key-value pairs**:
- **Keys**: Relative paths within workspace (e.g., `/documents/file1.txt`)
- **Values**: The actual data stored in DynamoDB (`item.data` field)

### Validation

1. **Workspace ID**: Alphanumeric with hyphens/underscores, 1-255 characters
2. **Path Prefix**: Must start with `/`, contain valid path characters, 1-1024 characters  
3. **Limit**: Must be between 1-1000 (defaults to 100)
4. **Workspace Access**: Validates user has read access to workspace

### Error Categories

- **validation**: Invalid input parameters (400)
- **authorization**: Access denied or invalid workspace (403)
- **throttling**: DynamoDB throughput exceeded (429)
- **not_found**: Resource not found (404)
- **server_error**: Internal errors (500)

## Testing

The function includes comprehensive unit tests covering:
- Request parsing (POST body and GET query parameters)
- Input validation and error handling
- DynamoDB operations and responses
- Data structure conversion
- Performance monitoring and SLA warnings
- Pagination support
- CORS handling

Run tests with:
```bash
npm test
```

## Environment Variables

- `DYNAMODB_TABLE`: DynamoDB table name (default: "TreeChatData")
- `NODE_ENV`: Environment setting (affects logging level)

## Usage Examples

### Basic Tree Query
```bash
curl -X POST https://api.example.com/tree-query \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "my-workspace",
    "pathPrefix": "/documents"
  }'
```

### Paginated Query
```bash
curl -X GET "https://api.example.com/tree-query?workspaceId=my-workspace&pathPrefix=/documents&limit=50&lastKey=..."
```

### Empty Results
For paths with no matching items, the function returns:
```json
{
  "success": true,
  "data": {},
  "metadata": { "itemCount": 0, "hasMore": false }
}
```

This ensures consistent API behavior and prevents null reference errors in client code.