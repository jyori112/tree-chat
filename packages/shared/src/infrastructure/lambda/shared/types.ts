/**
 * Common types for DynamoDB operations
 */

/**
 * Standard response format for API Gateway Lambda functions
 */
export interface APIResponse<T = any> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Common DynamoDB item structure for chat sessions
 */
export interface ChatSession {
  id: string;
  userId?: string;
  title?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Common DynamoDB item structure for chat messages
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  parentId?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Tree node structure for hierarchical data
 */
export interface TreeNode<T = any> {
  id: string;
  parent?: string;
  data: T;
  children: TreeNode<T>[];
}

/**
 * Batch operation types
 */
export type BatchOperationType = 'put' | 'delete';

export interface BatchOperation {
  type: BatchOperationType;
  tableName: string;
  item?: any;
  key?: any;
}

/**
 * Error types for DynamoDB operations
 */
export interface DynamoDBError {
  name: string;
  message: string;
  statusCode?: number;
  retryable?: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  lastKey?: string;
}

/**
 * Query parameters for tree operations
 */
export interface TreeQueryParams {
  maxDepth?: number;
  includeMetadata?: boolean;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  table?: string;
  error?: string;
}