/**
 * Enhanced DynamoDB Client for Lambda Functions
 * 
 * This module provides a production-ready DynamoDB client with:
 * - Connection pooling and reuse
 * - Exponential backoff retry logic
 * - Throttling detection and handling
 * - Performance optimizations
 * - Comprehensive error handling
 * - Support for both local and AWS DynamoDB
 * - Tree structure operations
 * - Batch operations with automatic chunking
 * - Transaction support
 * - Health check capabilities
 */

// Main client exports
export {
  EnhancedDynamoDBClient,
  getDynamoDBClient,
  resetDynamoDBClient,
} from './dynamodb-client';

// Type exports
export type {
  DynamoDBClientOptions,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  BatchGetCommandInput,
  BatchWriteCommandInput,
  TransactWriteCommandInput,
  TransactGetCommandInput,
  GetCommandOutput,
  PutCommandOutput,
  UpdateCommandOutput,
  DeleteCommandOutput,
  QueryCommandOutput,
  ScanCommandOutput,
  BatchGetCommandOutput,
  BatchWriteCommandOutput,
  TransactWriteCommandOutput,
  TransactGetCommandOutput,
} from './dynamodb-client';

// Common types
export type {
  APIResponse,
  ChatSession,
  ChatMessage,
  TreeNode,
  BatchOperationType,
  BatchOperation,
  DynamoDBError,
  PaginationParams,
  TreeQueryParams,
  HealthCheckResponse,
} from './types';

// Example handlers (for reference and testing)
export {
  exampleCrudHandler,
  exampleTreeHandler,
  exampleBatchHandler,
  exampleTransactionHandler,
  exampleHealthHandler,
  createCustomDynamoDBClient,
} from './dynamodb-examples';

// Data infrastructure Lambda functions
export { handler as dataReadHandler } from '../data-read/index';
export { handler as dataWriteHandler } from '../data-write/index';
export { handler as dataTreeHandler } from '../data-tree/index';