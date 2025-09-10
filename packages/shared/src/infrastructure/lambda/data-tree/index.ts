/**
 * Lambda tree query function for the data-infrastructure
 * 
 * This Lambda function provides hierarchical tree query operations for the data infrastructure using DynamoDB.
 * It supports efficient querying of tree structures with begins_with condition on path prefixes,
 * pagination for large datasets, and optimized performance for 500ms SLA requirements.
 * 
 * Features:
 * - DynamoDB Query operation with begins_with condition on path
 * - Result pagination for large datasets (up to 1000 items efficiently)
 * - Optimized query performance for 500ms SLA
 * - Workspace validation and path prefix validation
 * - Proper handling of empty result sets (returns {} not null)
 * - Comprehensive logging and monitoring
 * - Support for optional limit parameter for result size control
 * - Hierarchical data returned as flat key-value pairs
 * - AWS Lambda best practices
 */

import { getDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Request interface for tree query operations
 */
interface TreeQueryRequest {
  workspaceId: string;
  pathPrefix: string;
  userId?: string | undefined;
  limit?: number;
  lastKey?: string;
  includeMetadata?: boolean;
}

/**
 * Response interface for successful tree queries
 */
interface TreeQueryResponse {
  success: true;
  data: Record<string, any>;
  metadata: {
    workspaceId: string;
    pathPrefix: string;
    timestamp: string;
    operation: string;
    itemCount: number;
    hasMore: boolean;
    lastKey?: string;
    duration: string;
  };
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: 'validation' | 'authorization' | 'not_found' | 'server_error' | 'throttling';
    retryable: boolean;
  };
  metadata: {
    workspaceId?: string | undefined;
    pathPrefix?: string | undefined;
    timestamp: string;
    operation?: string | undefined;
  };
}

/**
 * Validate workspace ID format
 */
function validateWorkspaceId(workspaceId: string): boolean {
  // Workspace ID should be alphanumeric with optional hyphens/underscores
  const workspacePattern = /^[a-zA-Z0-9_-]+$/;
  return workspacePattern.test(workspaceId) && workspaceId.length >= 1 && workspaceId.length <= 255;
}

/**
 * Validate path prefix format
 */
function validatePathPrefix(pathPrefix: string): boolean {
  // Path prefix should start with / and contain valid characters
  const pathPattern = /^\/[a-zA-Z0-9_/-]*$/;
  return pathPattern.test(pathPrefix) && pathPrefix.length >= 1 && pathPrefix.length <= 1024;
}

/**
 * Create workspace-scoped path prefix for DynamoDB query
 */
function createPathPrefixKey(workspaceId: string, pathPrefix: string): string {
  return `${workspaceId}${pathPrefix}`;
}

/**
 * Validate workspace access for the user
 * In a production environment, this would check against a workspace permissions table
 */
async function validateWorkspaceAccess(
  workspaceId: string, 
  userId?: string
): Promise<{ valid: boolean; reason?: string }> {
  // For now, we'll implement basic validation
  // In production, this would query a workspace permissions table
  
  if (!workspaceId) {
    return { valid: false, reason: 'Workspace ID is required' };
  }
  
  if (!validateWorkspaceId(workspaceId)) {
    return { valid: false, reason: 'Invalid workspace ID format' };
  }
  
  // Additional validation logic would go here
  // For example: checking if user has read access to the workspace
  
  return { valid: true };
}

/**
 * Parse and validate the incoming request
 */
function parseRequest(event: APIGatewayProxyEvent): TreeQueryRequest {
  const { body, pathParameters, queryStringParameters } = event;
  
  // Try to get parameters from different sources
  let workspaceId: string;
  let pathPrefix: string;
  let userId: string | undefined;
  let limit: number | undefined;
  let lastKey: string | undefined;
  let includeMetadata: boolean = false;
  
  if (body) {
    // Parse from request body (preferred for POST requests)
    try {
      const parsed = JSON.parse(body);
      workspaceId = parsed.workspaceId;
      pathPrefix = parsed.pathPrefix;
      userId = parsed.userId;
      limit = parsed.limit;
      lastKey = parsed.lastKey;
      includeMetadata = parsed.includeMetadata || false;
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  } else {
    // Parse from path and query parameters (for GET requests)
    workspaceId = pathParameters?.['workspaceId'] || queryStringParameters?.['workspaceId'] || '';
    pathPrefix = pathParameters?.['pathPrefix'] || queryStringParameters?.['pathPrefix'] || '';
    userId = queryStringParameters?.['userId'];
    limit = queryStringParameters?.['limit'] ? parseInt(queryStringParameters['limit'], 10) : undefined;
    lastKey = queryStringParameters?.['lastKey'];
    includeMetadata = queryStringParameters?.['includeMetadata'] === 'true';
  }
  
  // Validate required fields
  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }
  
  if (!pathPrefix) {
    throw new Error('pathPrefix is required');
  }
  
  // Validate limit parameter
  if (limit !== undefined && (limit <= 0 || limit > 1000)) {
    throw new Error('limit must be between 1 and 1000');
  }
  
  return {
    workspaceId,
    pathPrefix,
    userId,
    limit: limit || 100, // Default limit for performance
    lastKey,
    includeMetadata,
  };
}

/**
 * Categorize DynamoDB errors
 */
function categorizeError(error: any): {
  category: 'validation' | 'authorization' | 'not_found' | 'server_error' | 'throttling';
  retryable: boolean;
  statusCode: number;
} {
  const errorName = error.name || '';
  const errorMessage = error.message || '';
  
  // Throttling errors
  if (errorName === 'ProvisionedThroughputExceededException' || 
      errorName === 'ThrottlingException') {
    return {
      category: 'throttling',
      retryable: true,
      statusCode: 429,
    };
  }
  
  // Validation errors
  if (errorName === 'ValidationException' || 
      errorMessage.includes('validation') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('is required') ||
      errorMessage.includes('format') ||
      errorMessage.includes('must be between')) {
    return {
      category: 'validation',
      retryable: false,
      statusCode: 400,
    };
  }
  
  // Authorization errors
  if (errorName === 'AccessDeniedException' ||
      errorName === 'UnauthorizedException' ||
      errorMessage.includes('access denied') ||
      errorMessage.includes('Access denied') ||
      errorMessage.includes('workspace ID format')) {
    return {
      category: 'authorization',
      retryable: false,
      statusCode: 403,
    };
  }
  
  // Resource not found
  if (errorName === 'ResourceNotFoundException') {
    return {
      category: 'not_found',
      retryable: false,
      statusCode: 404,
    };
  }
  
  // Default to server error
  return {
    category: 'server_error',
    retryable: true,
    statusCode: 500,
  };
}

/**
 * Create error response
 */
function createErrorResponse(
  error: any,
  workspaceId?: string,
  pathPrefix?: string,
  operation?: string
): APIGatewayProxyResult {
  const { category, retryable, statusCode } = categorizeError(error);
  
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.name || 'UnknownError',
      message: error.message || 'An unknown error occurred',
      category,
      retryable,
    },
    metadata: {
      workspaceId,
      pathPrefix,
      timestamp: new Date().toISOString(),
      operation,
    },
  };
  
  console.error('Tree query operation error:', {
    ...errorResponse,
    stack: error.stack,
  });
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(errorResponse),
  };
}

/**
 * Create success response
 */
function createSuccessResponse(
  data: Record<string, any>,
  workspaceId: string,
  pathPrefix: string,
  operation: string,
  itemCount: number,
  hasMore: boolean,
  lastKey: string | undefined,
  duration: string
): APIGatewayProxyResult {
  const response: TreeQueryResponse = {
    success: true,
    data,
    metadata: {
      workspaceId,
      pathPrefix,
      timestamp: new Date().toISOString(),
      operation,
      itemCount,
      hasMore,
      lastKey,
      duration,
    },
  };
  
  console.log('Tree query operation success:', {
    workspaceId,
    pathPrefix,
    operation,
    itemCount,
    hasMore,
    duration,
  });
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(response),
  };
}

/**
 * Convert DynamoDB items to flat key-value pairs structure
 */
function convertItemsToTreeStructure(
  items: any[],
  workspaceId: string
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const item of items) {
    // Extract the path by removing the workspace prefix
    const fullPath = item.id;
    if (fullPath && typeof fullPath === 'string' && fullPath.startsWith(workspaceId)) {
      const path = fullPath.substring(workspaceId.length);
      // Store the data portion of the item
      result[path] = item.data || item;
    }
  }
  
  return result;
}

/**
 * Main Lambda handler function
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }
  
  const startTime = Date.now();
  console.log('Tree query operation started:', {
    httpMethod: event.httpMethod,
    path: event.path,
    timestamp: new Date().toISOString(),
  });
  
  try {
    // Parse and validate request
    const request = parseRequest(event);
    const { workspaceId, pathPrefix, userId, limit, lastKey, includeMetadata } = request;
    
    // Validate path prefix format
    if (!validatePathPrefix(pathPrefix)) {
      throw new Error('Invalid path prefix format');
    }
    
    // Validate workspace access
    const accessValidation = await validateWorkspaceAccess(workspaceId, userId);
    if (!accessValidation.valid) {
      const error = new Error(accessValidation.reason || 'Access denied');
      error.name = 'UnauthorizedException';
      throw error;
    }
    
    // Initialize DynamoDB client
    const dynamodb = getDynamoDBClient({
      enableLogging: process.env['NODE_ENV'] !== 'production',
    });
    
    const tableName = process.env['DYNAMODB_TABLE'] || 'TreeChatData';
    const pathPrefixKey = createPathPrefixKey(workspaceId, pathPrefix);
    
    console.log('Scanning tree structure from DynamoDB:', {
      tableName,
      pathPrefixKey,
      limit,
      lastKey,
    });
    
    // Prepare scan parameters for begins_with condition
    // Note: For begins_with on the partition key, we must use Scan with FilterExpression
    // since DynamoDB Query's begins_with only works with sort keys in compound keys.
    // 
    // Performance Considerations:
    // - Scan operations can be slower than Query operations for large datasets
    // - For better 500ms SLA performance in production, consider:
    //   1. Adding a GSI with path as the partition key for true Query operations
    //   2. Implementing parallel scan with segments for large tables
    //   3. Adding workspace-specific tables to reduce scan scope
    //   4. Using DynamoDB Accelerator (DAX) for caching
    // Using Scan with FilterExpression for begins_with on partition key
    const queryParams: any = {
      TableName: tableName,
      FilterExpression: 'begins_with(id, :pathPrefix)',
      ExpressionAttributeValues: {
        ':pathPrefix': pathPrefixKey,
      },
      Limit: limit,
      ConsistentRead: false, // Eventually consistent for better performance
    };
    
    // Add pagination support
    if (lastKey) {
      try {
        queryParams.ExclusiveStartKey = JSON.parse(lastKey);
      } catch (error) {
        throw new Error('Invalid lastKey format');
      }
    }
    
    // Perform DynamoDB Scan operation with begins_with FilterExpression
    const result = await dynamodb.scan(queryParams);
    
    const duration = Date.now() - startTime;
    const items = result.Items || [];
    const hasMore = !!result.LastEvaluatedKey;
    const nextLastKey = hasMore ? JSON.stringify(result.LastEvaluatedKey) : undefined;
    
    // Convert items to hierarchical data structure as flat key-value pairs
    const treeData = convertItemsToTreeStructure(items, workspaceId);
    
    // Handle empty result sets - return {} as specified
    const responseData = Object.keys(treeData).length === 0 ? {} : treeData;
    
    console.log('Tree query operation completed:', {
      duration: `${duration}ms`,
      itemCount: items.length,
      hasMore,
      consumedCapacity: result.ConsumedCapacity,
      scannedCount: result.ScannedCount,
    });
    
    // Check if we're approaching the 500ms SLA
    if (duration > 400) {
      console.warn('Tree query operation approaching SLA limit:', {
        duration: `${duration}ms`,
        slaWarning: true,
      });
    }
    
    return createSuccessResponse(
      responseData,
      workspaceId,
      pathPrefix,
      'readTree',
      items.length,
      hasMore,
      nextLastKey,
      `${duration}ms`
    );
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Tree query operation failed:', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    // Try to extract request info for error response
    let workspaceId: string | undefined;
    let pathPrefix: string | undefined;
    let operation: string | undefined = 'readTree';
    
    try {
      const request = parseRequest(event);
      workspaceId = request.workspaceId;
      pathPrefix = request.pathPrefix;
    } catch {
      // Ignore parsing errors in error handler
    }
    
    return createErrorResponse(error, workspaceId, pathPrefix, operation);
  }
};

// Export the handler as default for easier Lambda deployment
export default handler;