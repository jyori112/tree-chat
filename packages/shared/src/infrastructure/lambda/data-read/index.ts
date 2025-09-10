/**
 * Lambda read function for the data-infrastructure
 * 
 * This Lambda function provides read operations for the data infrastructure using DynamoDB.
 * It supports both regular read and readWithDefault operations with proper error handling,
 * workspace validation, and comprehensive logging.
 * 
 * Features:
 * - DynamoDB GetItem operation with strong consistency
 * - Workspace validation at Lambda level
 * - Path format validation
 * - Error categorization and proper HTTP status codes
 * - Operation logging for monitoring
 * - Support for readWithDefault operations with fallback values
 * - AWS Lambda best practices
 */

import { getDynamoDBClient } from '../shared/dynamodb-client';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Request interface for read operations
 */
interface ReadRequest {
  workspaceId: string;
  path: string;
  userId?: string | undefined;
  defaultValue?: any;
  operation: 'read' | 'readWithDefault';
}

/**
 * Response interface for successful reads
 */
interface ReadResponse {
  success: true;
  data: any;
  metadata: {
    workspaceId: string;
    path: string;
    timestamp: string;
    operation: string;
    found: boolean;
    defaultUsed?: boolean | undefined;
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
    path?: string | undefined;
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
function parseRequest(event: APIGatewayProxyEvent): ReadRequest {
  const { body, pathParameters, queryStringParameters } = event;
  
  // Try to get parameters from different sources
  let workspaceId: string;
  let path: string;
  let userId: string | undefined;
  let defaultValue: any;
  let operation: 'read' | 'readWithDefault' = 'read';
  
  if (body) {
    // Parse from request body (preferred for POST requests)
    try {
      const parsed = JSON.parse(body);
      workspaceId = parsed.workspaceId;
      path = parsed.path;
      userId = parsed.userId;
      defaultValue = parsed.defaultValue;
      operation = parsed.operation || 'read';
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  } else {
    // Parse from path and query parameters (for GET requests)
    workspaceId = pathParameters?.['workspaceId'] || queryStringParameters?.['workspaceId'] || '';
    path = pathParameters?.['path'] || queryStringParameters?.['path'] || '';
    userId = queryStringParameters?.['userId'];
    if (queryStringParameters?.['defaultValue']) {
      try {
        defaultValue = JSON.parse(queryStringParameters['defaultValue']);
        operation = 'readWithDefault';
      } catch {
        // If parsing fails, treat as string
        defaultValue = queryStringParameters['defaultValue'];
        operation = 'readWithDefault';
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
  
  return {
    workspaceId,
    path,
    userId,
    defaultValue,
    operation: defaultValue !== undefined ? 'readWithDefault' : operation,
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
  path?: string,
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
      path,
      timestamp: new Date().toISOString(),
      operation,
    },
  };
  
  console.error('Read operation error:', {
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
  data: any,
  workspaceId: string,
  path: string,
  operation: string,
  found: boolean,
  defaultUsed?: boolean
): APIGatewayProxyResult {
  const response: ReadResponse = {
    success: true,
    data,
    metadata: {
      workspaceId,
      path,
      timestamp: new Date().toISOString(),
      operation,
      found,
      defaultUsed,
    },
  };
  
  console.log('Read operation success:', {
    workspaceId,
    path,
    operation,
    found,
    defaultUsed,
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
  console.log('Read operation started:', {
    httpMethod: event.httpMethod,
    path: event.path,
    timestamp: new Date().toISOString(),
  });
  
  try {
    // Parse and validate request
    const request = parseRequest(event);
    const { workspaceId, path, userId, defaultValue, operation } = request;
    
    // Validate path format
    if (!validatePath(path)) {
      throw new Error('Invalid path format');
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
    const dataKey = createDataKey(workspaceId, path);
    
    console.log('Reading from DynamoDB:', {
      tableName,
      key: dataKey,
      operation,
    });
    
    // Perform DynamoDB GetItem operation with strong consistency
    const result = await dynamodb.get({
      TableName: tableName,
      Key: {
        id: dataKey,
      },
      ConsistentRead: true, // Strong consistency as required
    });
    
    const duration = Date.now() - startTime;
    
    if (result.Item) {
      // Item found - return the data
      const itemData = result.Item['data'] || result.Item;
      
      console.log('Read operation completed:', {
        duration: `${duration}ms`,
        found: true,
        consumedCapacity: result.ConsumedCapacity,
      });
      
      return createSuccessResponse(
        itemData,
        workspaceId,
        path,
        operation,
        true,
        false
      );
    } else {
      // Item not found
      if (operation === 'readWithDefault' && defaultValue !== undefined) {
        // Return default value
        console.log('Read operation completed with default:', {
          duration: `${duration}ms`,
          found: false,
          defaultUsed: true,
        });
        
        return createSuccessResponse(
          defaultValue,
          workspaceId,
          path,
          operation,
          false,
          true
        );
      } else {
        // No default value, return null
        console.log('Read operation completed:', {
          duration: `${duration}ms`,
          found: false,
        });
        
        return createSuccessResponse(
          null,
          workspaceId,
          path,
          operation,
          false,
          false
        );
      }
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Read operation failed:', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });
    
    // Try to extract request info for error response
    let workspaceId: string | undefined;
    let path: string | undefined;
    let operation: string | undefined;
    
    try {
      const request = parseRequest(event);
      workspaceId = request.workspaceId;
      path = request.path;
      operation = request.operation;
    } catch {
      // Ignore parsing errors in error handler
    }
    
    return createErrorResponse(error, workspaceId, path, operation);
  }
};

// Export the handler as default for easier Lambda deployment
export default handler;