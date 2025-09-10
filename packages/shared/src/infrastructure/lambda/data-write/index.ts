/**
 * Lambda write function for the data-infrastructure
 * 
 * This Lambda function provides write operations for the data infrastructure using DynamoDB.
 * It supports secure data storage with proper validation, audit trails, optimistic locking,
 * and comprehensive error handling for production environments.
 * 
 * Features:
 * - DynamoDB PutItem operation with audit trail metadata
 * - Optimistic locking for concurrent modifications
 * - Workspace validation at Lambda level
 * - Path format validation and sanitization
 * - Item size validation (400KB DynamoDB limit)
 * - Error categorization with proper HTTP status codes
 * - Operation logging for monitoring and debugging
 * - Nullable-first design (supports null values)
 * - Audit tracking (updatedAt, updatedBy, version)
 * - AWS Lambda best practices
 */

import { getDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Request interface for write operations
 */
interface WriteRequest {
  workspaceId: string;
  path: string;
  value: any; // Supports any JSON-serializable value, including null
  userId?: string | undefined;
  operation: 'write';
  options?: {
    /** If true, require existing item with matching version for update */
    requireVersion?: boolean | undefined;
    /** Expected version for optimistic locking */
    expectedVersion?: number | undefined;
    /** Additional metadata to store with the item */
    metadata?: Record<string, any> | undefined;
  } | undefined;
}

/**
 * Response interface for successful writes
 */
interface WriteResponse {
  success: true;
  data: {
    /** The stored value */
    value: any;
    /** Version number after the write */
    version: number;
    /** Whether this was a create (true) or update (false) */
    created: boolean;
  };
  metadata: {
    workspaceId: string;
    path: string;
    timestamp: string;
    operation: string;
    userId?: string | undefined;
    itemSize: number; // Size in bytes
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
    category: 'validation' | 'authorization' | 'conflict' | 'size_limit' | 'server_error' | 'throttling';
    retryable: boolean;
  };
  metadata: {
    workspaceId?: string | undefined;
    path?: string | undefined;
    timestamp: string;
    operation?: string | undefined;
    userId?: string | undefined;
  };
}

/**
 * DynamoDB item structure for data storage
 */
interface DataItem {
  /** Workspace-scoped key: workspaceId + path */
  id: string;
  /** The actual data value (can be null) */
  data: any;
  /** Version number for optimistic locking */
  version: number;
  /** Workspace ID for partitioning */
  workspaceId: string;
  /** Path within workspace */
  path: string;
  /** User who created the item */
  createdBy?: string | undefined;
  /** User who last updated the item */
  updatedBy?: string | undefined;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Additional metadata */
  metadata?: Record<string, any> | undefined;
}

/**
 * DynamoDB item size limit (400KB) with safety margin
 */
const ITEM_SIZE_LIMIT = 350 * 1024; // 350KB to leave safety margin

/**
 * Validate workspace ID format
 */
function validateWorkspaceId(workspaceId: string): boolean {
  // Workspace ID should be alphanumeric with optional hyphens/underscores
  const workspacePattern = /^[a-zA-Z0-9_-]+$/;
  return workspacePattern.test(workspaceId) && workspaceId.length >= 1 && workspaceId.length <= 255;
}

/**
 * Validate path format
 */
function validatePath(path: string): boolean {
  // Path should start with / and contain valid characters
  const pathPattern = /^\/[a-zA-Z0-9_/-]*$/;
  return pathPattern.test(path) && path.length >= 1 && path.length <= 1024;
}

/**
 * Create workspace-scoped key for DynamoDB
 */
function createDataKey(workspaceId: string, path: string): string {
  return `${workspaceId}${path}`;
}

/**
 * Calculate the approximate size of a DynamoDB item in bytes
 */
function calculateItemSize(item: any): number {
  // Simple JSON string length approximation
  // In reality, DynamoDB uses a more complex encoding, but this is a reasonable estimate
  const jsonString = JSON.stringify(item);
  return Buffer.byteLength(jsonString, 'utf8');
}

/**
 * Validate that the item size is within DynamoDB limits
 */
function validateItemSize(item: any): { valid: boolean; size: number; reason?: string } {
  const size = calculateItemSize(item);
  
  if (size > ITEM_SIZE_LIMIT) {
    return {
      valid: false,
      size,
      reason: `Item size (${Math.round(size / 1024)}KB) exceeds limit (${Math.round(ITEM_SIZE_LIMIT / 1024)}KB)`,
    };
  }
  
  return { valid: true, size };
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
  // For example: checking if user has write access to the workspace
  
  return { valid: true };
}

/**
 * Parse and validate the incoming request
 */
function parseRequest(event: APIGatewayProxyEvent): WriteRequest {
  const { body, pathParameters, queryStringParameters } = event;
  
  // Try to get parameters from different sources
  let workspaceId: string;
  let path: string;
  let value: any;
  let userId: string | undefined;
  let operation: 'write' = 'write';
  let options: WriteRequest['options'];
  
  if (body) {
    // Parse from request body (preferred for write requests)
    try {
      const parsed = JSON.parse(body);
      workspaceId = parsed.workspaceId;
      path = parsed.path;
      value = parsed.value; // Can be null, undefined, or any JSON value
      userId = parsed.userId;
      operation = parsed.operation || 'write';
      options = parsed.options;
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  } else {
    // Parse from path and query parameters (less common for write operations)
    workspaceId = pathParameters?.['workspaceId'] || queryStringParameters?.['workspaceId'] || '';
    path = pathParameters?.['path'] || queryStringParameters?.['path'] || '';
    userId = queryStringParameters?.['userId'];
    
    // For non-body requests, value must be in query params
    if (queryStringParameters?.['value']) {
      try {
        value = JSON.parse(queryStringParameters['value']);
      } catch {
        // If parsing fails, treat as string
        value = queryStringParameters['value'];
      }
    }
    
    // Parse options from query parameters
    if (queryStringParameters?.['requireVersion']) {
      options = options || {};
      options.requireVersion = queryStringParameters['requireVersion'] === 'true';
    }
    
    if (queryStringParameters?.['expectedVersion']) {
      options = options || {};
      try {
        options.expectedVersion = parseInt(queryStringParameters['expectedVersion'], 10);
      } catch {
        throw new Error('Invalid expectedVersion format');
      }
    }
  }
  
  // Validate required fields
  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }
  
  if (!path) {
    throw new Error('path is required');
  }
  
  // Note: value can be null or undefined, which is valid for nullable-first design
  
  return {
    workspaceId,
    path,
    value,
    userId,
    operation,
    options,
  };
}

/**
 * Categorize DynamoDB errors
 */
function categorizeError(error: any): {
  category: 'validation' | 'authorization' | 'conflict' | 'size_limit' | 'server_error' | 'throttling';
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
  
  // Conditional check failed (optimistic locking conflict)
  if (errorName === 'ConditionalCheckFailedException') {
    return {
      category: 'conflict',
      retryable: false,
      statusCode: 409,
    };
  }
  
  // Size limit errors
  if (errorMessage.includes('Item size') || 
      errorMessage.includes('exceeds limit') ||
      errorMessage.includes('too large')) {
    return {
      category: 'size_limit',
      retryable: false,
      statusCode: 413, // Payload Too Large
    };
  }
  
  // Validation errors
  if (errorName === 'ValidationException' || 
      errorMessage.includes('validation') ||
      errorMessage.includes('Invalid') ||
      errorMessage.includes('is required') ||
      errorMessage.includes('format')) {
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
  path?: string,
  operation?: string,
  userId?: string
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
      path,
      timestamp: new Date().toISOString(),
      operation,
      userId,
    },
  };
  
  console.error('Write operation error:', {
    ...errorResponse,
    stack: error.stack,
  });
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    },
    body: JSON.stringify(errorResponse),
  };
}

/**
 * Create success response
 */
function createSuccessResponse(
  value: any,
  version: number,
  created: boolean,
  workspaceId: string,
  path: string,
  operation: string,
  itemSize: number,
  userId?: string
): APIGatewayProxyResult {
  const response: WriteResponse = {
    success: true,
    data: {
      value,
      version,
      created,
    },
    metadata: {
      workspaceId,
      path,
      timestamp: new Date().toISOString(),
      operation,
      userId,
      itemSize,
    },
  };
  
  console.log('Write operation success:', {
    workspaceId,
    path,
    operation,
    created,
    version,
    itemSize,
    userId,
  });
  
  return {
    statusCode: created ? 201 : 200, // 201 for create, 200 for update
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    },
    body: JSON.stringify(response),
  };
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
        'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      },
      body: '',
    };
  }
  
  const startTime = Date.now();
  console.log('Write operation started:', {
    httpMethod: event.httpMethod,
    path: event.path,
    timestamp: new Date().toISOString(),
  });
  
  try {
    // Parse and validate request
    const request = parseRequest(event);
    const { workspaceId, path, value, userId, operation, options } = request;
    
    // Validate path format
    if (!validatePath(path)) {
      throw new Error('Invalid path format');
    }
    
    // Validate workspace access
    const accessValidation = await validateWorkspaceAccess(workspaceId, userId);
    if (!accessValidation.valid) {
      const error = new Error(accessValidation.reason || 'Access denied');
      // Workspace format validation is a validation error, not auth
      if (accessValidation.reason?.includes('format')) {
        error.name = 'ValidationException';
      } else {
        error.name = 'UnauthorizedException';
      }
      throw error;
    }
    
    // Initialize DynamoDB client
    const dynamodb = getDynamoDBClient({
      enableLogging: process.env['NODE_ENV'] !== 'production',
    });
    
    const tableName = process.env['DYNAMODB_TABLE'] || 'TreeChatData';
    const dataKey = createDataKey(workspaceId, path);
    const currentTime = new Date().toISOString();
    
    console.log('Writing to DynamoDB:', {
      tableName,
      key: dataKey,
      operation,
      hasValue: value !== undefined,
      valueIsNull: value === null,
    });
    
    // Check if item exists for version management
    let existingItem: DataItem | undefined;
    let isCreate = true;
    
    if (options?.requireVersion || options?.expectedVersion !== undefined) {
      // Need to read existing item for version checking
      const getResult = await dynamodb.get({
        TableName: tableName,
        Key: {
          id: dataKey,
        },
        ConsistentRead: true,
      });
      
      if (getResult.Item) {
        existingItem = getResult.Item as DataItem;
        isCreate = false;
        
        // Check version for optimistic locking
        if (options.expectedVersion !== undefined && 
            existingItem.version !== options.expectedVersion) {
          const error = new Error(
            `Version mismatch: expected ${options.expectedVersion}, got ${existingItem.version}`
          );
          error.name = 'ConditionalCheckFailedException';
          throw error;
        }
      } else if (options.requireVersion) {
        const error = new Error('Item does not exist, cannot update with version requirement');
        error.name = 'ConditionalCheckFailedException';
        throw error;
      }
    } else {
      // For simple writes, do a quick check to determine if it's create or update
      // This is optional and for metadata purposes only
      try {
        const getResult = await dynamodb.get({
          TableName: tableName,
          Key: {
            id: dataKey,
          },
          ConsistentRead: true,
          ProjectionExpression: 'id, version', // Only need these fields
        });
        
        if (getResult.Item) {
          existingItem = getResult.Item as DataItem;
          isCreate = false;
        }
      } catch (error) {
        // If read fails, treat as create (optimistic approach)
        console.warn('Could not read existing item for create/update detection:', error);
      }
    }
    
    // Prepare the item to store
    const newVersion = (existingItem?.version || 0) + 1;
    const dataItem: DataItem = {
      id: dataKey,
      data: value, // Can be null - nullable-first design
      version: newVersion,
      workspaceId,
      path,
      createdBy: existingItem?.createdBy || userId,
      updatedBy: userId,
      createdAt: existingItem?.createdAt || currentTime,
      updatedAt: currentTime,
      metadata: {
        ...existingItem?.metadata,
        ...options?.metadata,
      },
    };
    
    // Validate item size before storage
    const sizeValidation = validateItemSize(dataItem);
    if (!sizeValidation.valid) {
      const error = new Error(sizeValidation.reason || 'Item too large');
      error.name = 'ValidationException';
      throw error;
    }
    
    // Build condition expression for optimistic locking
    let conditionExpression: string | undefined;
    let expressionAttributeValues: Record<string, any> | undefined;
    
    if (options?.expectedVersion !== undefined) {
      conditionExpression = 'version = :expectedVersion';
      expressionAttributeValues = {
        ':expectedVersion': options.expectedVersion,
      };
    } else if (options?.requireVersion && existingItem) {
      conditionExpression = 'version = :currentVersion';
      expressionAttributeValues = {
        ':currentVersion': existingItem.version,
      };
    }
    
    // Perform DynamoDB PutItem operation
    const putParams: any = {
      TableName: tableName,
      Item: dataItem,
      ReturnConsumedCapacity: 'TOTAL',
    };
    
    // Add conditional check if needed
    if (conditionExpression) {
      putParams.ConditionExpression = conditionExpression;
      putParams.ExpressionAttributeValues = expressionAttributeValues;
    }
    
    const result = await dynamodb.put(putParams);
    
    const duration = Date.now() - startTime;
    
    console.log('Write operation completed:', {
      duration: `${duration}ms`,
      created: isCreate,
      version: newVersion,
      itemSize: sizeValidation.size,
      consumedCapacity: result.ConsumedCapacity,
    });
    
    return createSuccessResponse(
      value,
      newVersion,
      isCreate,
      workspaceId,
      path,
      operation,
      sizeValidation.size,
      userId
    );
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Write operation failed:', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    // Try to extract request info for error response
    let workspaceId: string | undefined;
    let path: string | undefined;
    let operation: string | undefined;
    let userId: string | undefined;
    
    try {
      const request = parseRequest(event);
      workspaceId = request.workspaceId;
      path = request.path;
      operation = request.operation;
      userId = request.userId;
    } catch {
      // Ignore parsing errors in error handler
    }
    
    return createErrorResponse(error, workspaceId, path, operation, userId);
  }
};

// Export the handler as default for easier Lambda deployment
export default handler;