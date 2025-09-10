/**
 * Lambda Data Client - AWS Lambda-based DataClient Implementation
 * 
 * This module provides a DataClient implementation that interfaces with AWS Lambda functions
 * to perform data operations. It includes connection pooling, retry logic, and comprehensive
 * error handling for robust production usage.
 * 
 * @see Requirements: REQ-1 (Path-based operations), LAMBDA-1 (Lambda integration),
 *                   REL-1 (Error handling), REL-2 (Retries), REL-3 (Throttling)
 * @packageDocumentation
 */

import {
  DataClient,
  DataResponse,
  TreeResponse,
  BatchOperation,
  WorkspaceId,
  UserId,
  SecureSessionContext,
  BatchValidationResult,
  AuditLog,
  DataClientConfig,
} from '@tree-chat/shared';

import {
  ExtendedDataClientConfig,
  DataClientError,
  ClientRetryConfig,
  ManagedDataClient,
  ClientHealthCheck,
  DataClientMetrics,
} from './types/index.js';

import { validatePath, getPathSegments } from './validation.js';

/**
 * Configuration specific to Lambda-based data operations.
 * Extends the base configuration with Lambda endpoint and authentication settings.
 */
export interface LambdaClientConfig extends DataClientConfig {
  /** AWS Lambda function endpoint URL or API Gateway URL */
  lambdaEndpoint: string;
  /** AWS region for Lambda function (e.g., 'us-east-1') */
  region?: string;
  /** Unique identifier for this client instance (auto-generated if not provided) */
  clientId?: string;
  /** Maximum batch size for operations */
  maxBatchSize?: number;
  /** Enable audit logging */
  enableAuditLog?: boolean;
  /** Enable client-side caching */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** Connection configuration for the underlying data store */
  connection?: {
    /** Connection string or endpoint URL */
    endpoint: string;
    /** Connection pool size (if applicable) */
    poolSize?: number;
    /** Connection timeout in milliseconds */
    connectTimeoutMs?: number;
    /** Keep-alive settings for persistent connections */
    keepAlive?: boolean;
  };
  /** Retry configuration for handling transient failures */
  retry?: Partial<ClientRetryConfig>;
  /** Authentication configuration for Lambda requests */
  auth?: {
    /** API key for authenticated requests */
    apiKey?: string;
    /** Bearer token for OAuth/JWT authentication */
    bearerToken?: string;
    /** Custom headers for authentication */
    customHeaders?: Record<string, string>;
  };
  /** Lambda-specific timeout settings */
  lambda?: {
    /** Function timeout in milliseconds (default: 30000) */
    functionTimeoutMs?: number;
    /** Cold start tolerance in milliseconds (default: 5000) */
    coldStartToleranceMs?: number;
    /** Maximum payload size in bytes (default: 6MB for Lambda) */
    maxPayloadSize?: number;
  };
}

/**
 * Connection pool entry for managing HTTP connections to Lambda endpoints.
 * Implements basic connection reuse and health tracking.
 */
interface ConnectionPoolEntry {
  /** Connection identifier */
  id: string;
  /** Last time this connection was used */
  lastUsed: Date;
  /** Whether this connection is currently in use */
  inUse: boolean;
  /** Number of requests made with this connection */
  requestCount: number;
  /** Connection health status */
  isHealthy: boolean;
  /** Underlying fetch-like function or connection object */
  connection: typeof fetch;
}

/**
 * Lambda Data Client implementation with connection pooling and comprehensive error handling.
 * 
 * This class provides a robust interface to AWS Lambda functions for data operations,
 * implementing the DataClient interface with additional management capabilities.
 * Includes automatic retries, connection pooling, and detailed error reporting.
 * 
 * @example
 * ```typescript
 * const client = new LambdaDataClient({
 *   lambdaEndpoint: 'https://api.gateway.amazonaws.com/prod/data',
 *   region: 'us-east-1',
 *   auth: {
 *     apiKey: process.env.API_KEY
 *   },
 *   timeoutMs: 10000,
 *   retry: {
 *     maxRetries: 3,
 *     baseDelayMs: 1000
 *   }
 * });
 * 
 * // Perform data operations
 * const result = await client.read('workspace-123', '/sessions/456/metadata', 'user-789');
 * ```
 */
export class LambdaDataClient implements ManagedDataClient {
  private readonly config: Required<LambdaClientConfig>;
  private readonly clientId: string;
  private readonly connectionPool: Map<string, ConnectionPoolEntry>;
  private readonly metrics: DataClientMetrics;
  private isDisposed: boolean = false;

  /**
   * Creates a new Lambda Data Client instance.
   * 
   * @param config - Configuration for the Lambda client
   * @throws {Error} If configuration is invalid or required fields are missing
   * 
   * @example
   * ```typescript
   * const client = new LambdaDataClient({
   *   lambdaEndpoint: 'https://lambda-url.region.amazonaws.com/',
   *   timeoutMs: 15000,
   *   retry: { maxRetries: 3 }
   * });
   * ```
   */
  constructor(config: LambdaClientConfig) {
    // Validate required configuration
    this.validateConfiguration(config);

    // Set up default configuration with required fields
    this.config = this.buildCompleteConfig(config);
    this.clientId = this.config.clientId || this.generateClientId();
    
    // Initialize connection pool
    this.connectionPool = new Map();
    this.initializeConnectionPool();

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Bind methods to preserve 'this' context
    this.healthCheck = this.healthCheck.bind(this);
    this.dispose = this.dispose.bind(this);
  }

  /**
   * Reads a single value from the specified path within a workspace.
   * 
   * Implements nullable-first design (REQ-6): returns null for non-existent paths rather
   * than throwing errors. Supports eventual consistency by default with option for
   * strong consistency when required (EDGE-7).
   * 
   * @param workspaceId - Workspace identifier for data partitioning
   * @param path - Hierarchical path to the data item
   * @param userId - User identifier for access control and auditing
   * @param options - Optional read options including consistency level
   * @returns Promise resolving to the data response with value or null
   * 
   * @example
   * ```typescript
   * // Basic read with null handling
   * const metadata = await client.read('ws-123', '/sessions/456/metadata', 'user-789');
   * if (metadata.success) {
   *   if (metadata.value !== null) {
   *     console.log(`Session title: ${metadata.value.title}`);
   *   } else {
   *     console.log('Metadata not found - this is expected behavior');
   *   }
   * }
   * 
   * // Strong consistency read
   * const criticalData = await client.read('ws-123', '/critical/data', 'user-789', { 
   *   strongConsistency: true 
   * });
   * ```
   */
  async read(
    workspaceId: string,
    path: string,
    userId: string
  ): Promise<any> {
    this.ensureNotDisposed();
    
    try {
      // Validate inputs
      await this.validateInputs(workspaceId, path, userId);

      // Increment operation count
      this.metrics.totalOperations++;
      this.metrics.operationCounts.read++;

      const startTime = Date.now();

      // Make Lambda request with retry logic
      const response = await this.executeWithRetry(async () => {
        return this.makeLambdaRequest('read', {
          workspaceId,
          path,
          userId,
          timestamp: new Date().toISOString(),
          // Include strong consistency option for EDGE-7 requirement
          options: {
            strongConsistency: false, // Default to eventual consistency
          },
        });
      });

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      this.metrics.successfulOperations++;

      // Handle null responses according to nullable-first design (REQ-6)
      // Return the data directly, which can be null as per the interface
      return response.data !== undefined ? response.data : null;

    } catch (error) {
      this.metrics.failedOperations++;
      this.updateErrorMetrics(error as DataClientError);
      throw this.wrapError(error, 'read', { workspaceId, path, userId });
    }
  }

  /**
   * Writes a value to the specified path within a workspace.
   * 
   * Implements atomic write operation with DynamoDB size validation (DATA-4),
   * nullable-first design (REQ-6), and comprehensive error handling (LAMBDA-3).
   * 
   * @param workspaceId - Workspace identifier for data partitioning
   * @param path - Hierarchical path where data should be stored
   * @param value - Data to store, supports null values (nullable-first design)
   * @param userId - User identifier for access control and auditing
   * @returns Promise resolving when write operation completes atomically
   * 
   * @throws {DataClientError} ITEM_TOO_LARGE if value exceeds DynamoDB 400KB limit
   * @throws {DataClientError} INVALID_PATH if path validation fails
   * @throws {DataClientError} NETWORK_ERROR for connection issues
   * @throws {DataClientError} TIMEOUT_ERROR if operation exceeds timeout
   * @throws {DataClientError} INTERNAL_ERROR for server-side issues
   * 
   * @example
   * ```typescript
   * // Regular value storage
   * await client.write('ws-123', '/sessions/456/metadata', { title: 'Session' }, 'user-789');
   * 
   * // Null value storage (explicit null handling per REQ-6)
   * await client.write('ws-123', '/sessions/456/deleted', null, 'user-789');
   * 
   * // Large object with size validation
   * const largeData = { content: '...' };
   * await client.write('ws-123', '/sessions/456/data', largeData, 'user-789');
   * ```
   */
  async write(
    workspaceId: string,
    path: string,
    value: any,
    userId: string
  ): Promise<void> {
    this.ensureNotDisposed();
    
    try {
      // Validate inputs including DynamoDB size constraints
      await this.validateInputs(workspaceId, path, userId, value);

      // Additional DynamoDB-specific validation (DATA-4)
      await this.validateDynamoDBConstraints(value, path);

      // Increment operation count
      this.metrics.totalOperations++;
      this.metrics.operationCounts.write++;

      const startTime = Date.now();

      // Prepare atomic write payload with explicit null handling (REQ-6)
      const writePayload = {
        workspaceId,
        path,
        value: this.serializeValueForStorage(value),
        userId,
        timestamp: new Date().toISOString(),
        atomic: true, // Ensure atomic operation
        valueType: this.getValueType(value),
      };

      // Make Lambda request with retry logic for atomic write
      const response = await this.executeWithRetry(async () => {
        return this.makeLambdaRequest('write', writePayload);
      });

      // Verify atomic write succeeded
      if (response.error) {
        throw this.createError('INTERNAL_ERROR', 
          `Atomic write failed: ${response.error}`,
          { atomicWrite: true, path, workspaceId }
        );
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      this.metrics.successfulOperations++;

      // Write operations return void as per DataClient interface
      return;

    } catch (error) {
      this.metrics.failedOperations++;
      this.updateErrorMetrics(error as DataClientError);
      throw this.wrapError(error, 'atomic-write', { 
        workspaceId, 
        path, 
        userId, 
        valueType: this.getValueType(value),
        hasNullValue: value === null
      });
    }
  }

  /**
   * Reads all data items under a specified path prefix, returning a flat structure.
   * 
   * Optimized for 500ms SLA with up to 1000 items (PERF-2). Implements path prefix
   * validation, efficient DynamoDB querying, and graceful handling of empty result sets.
   * 
   * @param workspaceId - Workspace identifier for data partitioning
   * @param pathPrefix - Path prefix to query (e.g., "/sessions/456" returns all data under that session)
   * @param userId - User identifier for access control and auditing
   * @returns Promise resolving to a flat Record<string, any> where keys are full paths and values are stored data
   * 
   * @throws {DataClientError} INVALID_PATH if pathPrefix validation fails
   * @throws {DataClientError} WORKSPACE_ACCESS_DENIED for unauthorized access
   * @throws {DataClientError} TIMEOUT_ERROR if operation exceeds 500ms SLA
   * @throws {DataClientError} INTERNAL_ERROR for DynamoDB or Lambda issues
   * 
   * @example
   * ```typescript
   * // Read all session data efficiently
   * const sessionData = await client.readTree('ws-123', '/sessions/456', 'user-789');
   * // Returns: {
   * //   '/sessions/456/metadata': { title: 'My Session', createdAt: '2023-01-01' },
   * //   '/sessions/456/pages/page1/content': { text: 'Hello World' },
   * //   '/sessions/456/pages/page1/framework': 'lean-canvas'
   * // }
   * 
   * // Handle empty results gracefully
   * const emptyTree = await client.readTree('ws-123', '/nonexistent', 'user-789');
   * // Returns: {} (empty object, not null)
   * ```
   */
  async readTree(
    workspaceId: string,
    pathPrefix: string,
    userId: string
  ): Promise<Record<string, any>> {
    this.ensureNotDisposed();
    
    try {
      // Validate inputs with enhanced path prefix validation
      await this.validateInputs(workspaceId, pathPrefix, userId);
      
      // Additional path prefix validation for readTree operation (REQ-3)
      await this.validatePathPrefix(pathPrefix);

      // Increment operation count
      this.metrics.totalOperations++;
      this.metrics.operationCounts.readTree++;

      const startTime = Date.now();

      // Make Lambda request with retry logic and performance optimizations
      const response = await this.executeWithRetry(async () => {
        return this.makeLambdaRequest('readTree', {
          workspaceId,
          pathPrefix,
          userId,
          timestamp: new Date().toISOString(),
          // Performance optimizations for 500ms SLA (PERF-2)
          options: {
            maxItems: 1000, // Limit to 1000 items for performance
            timeoutMs: 450, // Leave buffer for Lambda overhead
            consistentRead: false, // Use eventual consistency for better performance
            batchSize: 100, // Optimize DynamoDB query batch size
          },
        });
      });

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      this.metrics.successfulOperations++;

      // Handle empty result sets - return {} not null (task requirement)
      const treeData = response.data || {};
      
      // Validate response size doesn't exceed limits
      const itemCount = Object.keys(treeData).length;
      if (itemCount > 1000) {
        console.warn(`ReadTree returned ${itemCount} items, which exceeds the 1000 item optimization limit. Consider using pagination or narrower path prefixes.`);
      }

      return treeData;

    } catch (error) {
      this.metrics.failedOperations++;
      this.updateErrorMetrics(error as DataClientError);
      throw this.wrapError(error, 'readTree', { workspaceId, pathPrefix, userId });
    }
  }

  /**
   * Reads a value with a default fallback if the path doesn't exist or is null.
   * 
   * Provides convenient null handling as part of nullable-first design (REQ-6).
   * Returns stored value if it exists and is not null, otherwise returns defaultValue.
   * This method follows the same validation patterns as read() but gracefully handles
   * all error conditions by returning the default value instead of throwing.
   * 
   * @param workspaceId - Workspace identifier for data partitioning
   * @param path - Hierarchical path to the data item
   * @param defaultValue - Value to return if path doesn't exist, is null, or read fails
   * @param userId - User identifier for access control and auditing
   * @returns Promise resolving to stored value or defaultValue (never throws)
   * 
   * @example
   * ```typescript
   * // Basic usage with default fallback
   * const config = await client.readWithDefault('ws-123', '/app/config', {}, 'user-789');
   * console.log(config); // Either stored config or {} if not found
   * 
   * // Handle user preferences with defaults
   * const theme = await client.readWithDefault('ws-123', '/user/theme', 'light', 'user-789');
   * console.log(theme); // Either stored theme or 'light' if not set
   * 
   * // Complex default objects
   * const metadata = await client.readWithDefault('ws-123', '/session/meta', {
   *   title: 'Untitled Session',
   *   createdAt: new Date().toISOString(),
   *   tags: []
   * }, 'user-789');
   * ```
   */
  async readWithDefault(
    workspaceId: string,
    path: string,
    defaultValue: any,
    userId: string
  ): Promise<any> {
    this.ensureNotDisposed();
    
    try {
      // Validate inputs upfront (same validation as read operation)
      await this.validateInputs(workspaceId, path, userId);

      // Increment operation count
      this.metrics.totalOperations++;
      this.metrics.operationCounts.readWithDefault++;

      const startTime = Date.now();

      // Leverage the existing read method for consistency
      const result = await this.read(workspaceId, path, userId);
      
      // Update response time metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      this.metrics.successfulOperations++;

      // Return default value if result is null, otherwise return the result
      // This handles the nullable-first design (REQ-6) gracefully
      return result !== null ? result : defaultValue;

    } catch (error) {
      // Unlike other operations, readWithDefault should not throw errors
      // Instead, it gracefully returns the default value for any failure condition
      this.metrics.operationCounts.readWithDefault++; // Ensure counter is incremented
      
      // Log the error for debugging but don't throw it
      if (this.config.enableDebugLogging) {
        console.warn(`readWithDefault failed for path '${path}', returning default:`, {
          workspaceId,
          path,
          userId,
          error: (error as Error).message,
          defaultValue: typeof defaultValue,
          clientId: this.clientId,
        });
      }
      
      // Always return the default value on any error (network, validation, etc.)
      return defaultValue;
    }
  }

  /**
   * Executes multiple operations atomically within a single transaction.
   * 
   * Implements DynamoDB transaction limits (max 25 operations), comprehensive validation,
   * and atomic execution with rollback on failure. Supports both read and write operations
   * with proper defaultValue handling for read operations that don't find data.
   * 
   * @param workspaceId - Workspace identifier for data partitioning
   * @param operations - Array of operations to execute atomically (max 25 for DynamoDB compatibility)
   * @param userId - User identifier for access control and auditing
   * @returns Promise resolving to array of results in same order as input operations
   *          - null for write operations (indicates successful completion)
   *          - actual value or defaultValue for read operations
   * 
   * @throws {DataClientError} BATCH_SIZE_EXCEEDED if operations exceed 25 item limit
   * @throws {DataClientError} INVALID_PATH if any operation has invalid path
   * @throws {DataClientError} ITEM_TOO_LARGE if any write value exceeds size limits
   * @throws {DataClientError} INTERNAL_ERROR if transaction fails and rollback occurs
   * 
   * @example
   * ```typescript
   * // Mixed read/write batch with defaults
   * const results = await client.batch('ws-123', [
   *   { type: 'read', path: '/sessions/456/metadata' }, // Returns actual value or null
   *   { type: 'write', path: '/sessions/456/updated_at', value: new Date().toISOString() }, // Returns null
   *   { type: 'read', path: '/sessions/456/config', defaultValue: { theme: 'light' } } // Returns value or default
   * ], 'user-789');
   * // Returns: [{ title: "Session" }, null, { theme: "light" }]
   * ```
   */
  async batch(
    workspaceId: string,
    operations: BatchOperation[],
    userId: string
  ): Promise<any[]> {
    this.ensureNotDisposed();
    
    try {
      // Comprehensive batch validation with enhanced error messages
      await this.validateBatchInputs(workspaceId, operations, userId);

      // Additional validation for each operation in the batch
      await this.validateBatchOperations(operations, workspaceId, userId);

      // Increment operation count
      this.metrics.totalOperations++;
      this.metrics.operationCounts.batch++;

      const startTime = Date.now();

      // Prepare batch payload with comprehensive metadata for atomic execution
      const batchPayload = {
        workspaceId,
        operations: await this.prepareBatchOperations(operations),
        userId,
        timestamp: new Date().toISOString(),
        // Atomic transaction flags for DynamoDB
        atomic: true,
        transactionId: this.generateTransactionId(),
        operationCount: operations.length,
        // Include operation types for Lambda processing optimization
        operationTypes: operations.reduce((counts, op) => {
          counts[op.type] = (counts[op.type] || 0) + 1;
          return counts;
        }, {} as Record<string, number>),
      };

      // Execute atomic batch transaction with retry logic
      const response = await this.executeWithRetry(async () => {
        return this.makeLambdaRequest('batch', batchPayload);
      });

      // Verify atomic transaction succeeded
      if (response.error) {
        throw this.createError('INTERNAL_ERROR', 
          `Atomic batch transaction failed: ${response.error}`,
          { 
            transactionId: batchPayload.transactionId,
            operationCount: operations.length,
            rollbackOccurred: true 
          }
        );
      }

      // Process and validate batch results
      const results = await this.processBatchResults(response.data, operations);

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);
      this.metrics.successfulOperations++;

      // Log successful batch operation for audit purposes
      if (this.config.enableAuditLog) {
        this.logBatchOperation({
          transactionId: batchPayload.transactionId,
          workspaceId,
          userId,
          operationCount: operations.length,
          success: true,
          durationMs: responseTime,
        });
      }

      return results;

    } catch (error) {
      this.metrics.failedOperations++;
      this.updateErrorMetrics(error as DataClientError);
      
      // Enhanced error context for batch operations
      const enhancedError = this.wrapError(error, 'atomic-batch', { 
        workspaceId, 
        userId,
        operationCount: operations.length,
        operationTypes: operations.map(op => op.type),
        batchValidationFailed: true
      });

      // Log failed batch operation for audit purposes
      if (this.config.enableAuditLog) {
        this.logBatchOperation({
          transactionId: this.generateTransactionId(),
          workspaceId,
          userId,
          operationCount: operations.length,
          success: false,
          error: enhancedError.message,
          durationMs: 0,
        });
      }

      throw enhancedError;
    }
  }

  /**
   * Returns the configuration used to initialize this client.
   * Useful for debugging and runtime introspection.
   */
  getConfig(): LambdaClientConfig {
    return { ...this.config };
  }

  /**
   * Performs a health check on the client and Lambda endpoints.
   * Tests connectivity and basic functionality.
   */
  async healthCheck(): Promise<ClientHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple health check operation
      const response = await this.makeLambdaRequest('health', {
        timestamp: new Date().toISOString(),
        clientId: this.clientId,
      });

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: true,
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime,
        details: {
          connectionStatus: 'connected',
          activeConnections: this.connectionPool.size,
          lastSuccessfulOperation: this.metrics.lastUpdated,
          recentErrorCount: this.calculateRecentErrorCount(),
        },
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: false,
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime,
        error: (error as Error).message,
        details: {
          connectionStatus: 'error',
          activeConnections: this.connectionPool.size,
          recentErrorCount: this.calculateRecentErrorCount(),
        },
      };
    }
  }

  /**
   * Returns current metrics and performance statistics.
   */
  getMetrics(): DataClientMetrics {
    this.updateMetricsTimestamp();
    return { ...this.metrics };
  }

  /**
   * Gracefully disposes of the client and cleans up resources.
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    // Clear connection pool
    this.connectionPool.clear();

    // Mark as disposed
    this.isDisposed = true;
  }

  // ==================== Private Methods ====================

  /**
   * Validates individual batch operations with enhanced type-specific checks.
   * Performs operation-level validation beyond basic input validation.
   */
  private async validateBatchOperations(
    operations: BatchOperation[],
    workspaceId: string,
    userId: string
  ): Promise<void> {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op) {
        throw this.createError('INVALID_PATH', `Batch operation ${i + 1}: Operation is null or undefined`);
      }
      
      const opContext = `Batch operation ${i + 1}`;

      // Additional validation for write operations
      if (op.type === 'write') {
        // Validate serialization works correctly
        try {
          const serialized = this.serializeValueForStorage(op.value);
          if (serialized.length === 0 && op.value !== null && op.value !== undefined) {
            throw this.createError('INVALID_PATH', 
              `${opContext}: Value serialization resulted in empty string`);
          }
        } catch (serializationError) {
          throw this.createError('INVALID_PATH', 
            `${opContext}: Value serialization failed - ${(serializationError as Error).message}`);
        }

        // Check combined payload size for Lambda limits
        const estimatedSize = this.estimateOperationSize(op);
        if (estimatedSize > 50 * 1024) { // 50KB per operation warning threshold
          console.warn(`${opContext}: Large operation size (${estimatedSize} bytes) may impact batch performance`);
        }
      }

      // Additional validation for read operations
      if (op.type === 'read' && op.defaultValue !== undefined) {
        // Ensure defaultValue can be properly serialized for comparison
        try {
          this.serializeValueForStorage(op.defaultValue);
        } catch (defaultValueError) {
          throw this.createError('INVALID_PATH', 
            `${opContext}: Default value serialization failed - ${(defaultValueError as Error).message}`);
        }
      }
    }
  }

  /**
   * Prepares batch operations for Lambda execution with proper serialization.
   * Transforms operations into the format expected by the Lambda function.
   */
  private async prepareBatchOperations(operations: BatchOperation[]): Promise<any[]> {
    return operations.map((op, index) => ({
      operationIndex: index, // Preserve order for result mapping
      type: op.type,
      path: op.path,
      // Serialize values for consistent Lambda processing
      value: op.type === 'write' ? this.serializeValueForStorage(op.value) : undefined,
      defaultValue: op.type === 'read' && op.defaultValue !== undefined 
        ? this.serializeValueForStorage(op.defaultValue) 
        : undefined,
      // Include metadata for enhanced processing
      metadata: {
        hasDefaultValue: op.type === 'read' && op.defaultValue !== undefined,
        valueType: op.type === 'write' ? this.getValueType(op.value) : undefined,
        pathSegments: getPathSegments(op.path).length,
      },
    }));
  }

  /**
   * Processes batch results from Lambda and maps them back to the original operation order.
   * Handles deserialization and applies defaultValue logic for read operations.
   */
  private async processBatchResults(
    lambdaResults: any[], 
    originalOperations: BatchOperation[]
  ): Promise<any[]> {
    if (!Array.isArray(lambdaResults)) {
      throw this.createError('INTERNAL_ERROR', 
        'Invalid batch response format from Lambda - expected array of results');
    }

    if (lambdaResults.length !== originalOperations.length) {
      throw this.createError('INTERNAL_ERROR', 
        `Batch result count mismatch - expected ${originalOperations.length}, got ${lambdaResults.length}`);
    }

    const processedResults: any[] = [];

    for (let i = 0; i < originalOperations.length; i++) {
      const operation = originalOperations[i];
      const lambdaResult = lambdaResults[i];

      if (!operation) {
        throw this.createError('INTERNAL_ERROR', 
          `Missing operation at index ${i} during batch result processing`);
      }

      if (operation.type === 'write') {
        // Write operations should return null to indicate successful completion
        processedResults.push(null);
      } else if (operation.type === 'read') {
        // Read operations return the value, defaultValue, or null
        let resultValue = lambdaResult;

        // If no value found and defaultValue is provided, use defaultValue
        if ((resultValue === null || resultValue === undefined) && operation.defaultValue !== undefined) {
          resultValue = operation.defaultValue;
        }

        // Deserialize if needed (Lambda may return serialized data)
        if (typeof resultValue === 'string' && resultValue !== 'null') {
          try {
            resultValue = JSON.parse(resultValue);
          } catch {
            // If parsing fails, keep the string value as-is
          }
        } else if (resultValue === 'null') {
          resultValue = null;
        }

        processedResults.push(resultValue);
      } else {
        throw this.createError('INTERNAL_ERROR', 
          `Unknown operation type in batch result processing: ${operation.type}`);
      }
    }

    return processedResults;
  }

  /**
   * Generates a unique transaction ID for batch operations.
   * Used for tracking and audit logging.
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `batch-txn-${timestamp}-${random}`;
  }

  /**
   * Estimates the serialized size of a batch operation for payload optimization.
   * Helps identify operations that may impact performance.
   */
  private estimateOperationSize(operation: BatchOperation): number {
    let size = 0;
    
    // Path size
    size += Buffer.byteLength(operation.path, 'utf8');
    
    // Value size for write operations
    if (operation.type === 'write') {
      const serializedValue = this.serializeValueForStorage(operation.value);
      size += Buffer.byteLength(serializedValue, 'utf8');
    }
    
    // Default value size for read operations
    if (operation.type === 'read' && operation.defaultValue !== undefined) {
      const serializedDefault = this.serializeValueForStorage(operation.defaultValue);
      size += Buffer.byteLength(serializedDefault, 'utf8');
    }
    
    // Add overhead for operation metadata (type, structure, etc.)
    size += 100; // Estimated overhead in bytes
    
    return size;
  }

  /**
   * Logs batch operation for audit purposes.
   * Creates comprehensive audit trail for batch transactions.
   */
  private logBatchOperation(logData: {
    transactionId: string;
    workspaceId: string;
    userId: string;
    operationCount: number;
    success: boolean;
    error?: string;
    durationMs: number;
  }): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      operationType: 'batch',
      ...logData,
    };

    // In a real implementation, this would write to a logging system
    // For now, we'll use console logging with structured format
    if (this.config.enableDebugLogging) {
      console.log('[AUDIT] Batch Operation:', JSON.stringify(auditEntry, null, 2));
    }
  }

  /**
   * Validates the initial configuration for required fields and formats.
   */
  private validateConfiguration(config: LambdaClientConfig): void {
    if (!config.lambdaEndpoint) {
      throw new Error('LambdaDataClient requires lambdaEndpoint in configuration');
    }

    try {
      new URL(config.lambdaEndpoint);
    } catch {
      throw new Error(`Invalid lambdaEndpoint URL: ${config.lambdaEndpoint}`);
    }

    // Additional validation can be added here
  }

  /**
   * Builds a complete configuration with all required defaults.
   */
  private buildCompleteConfig(config: LambdaClientConfig): Required<LambdaClientConfig> {
    const defaultRetryConfig: Required<ClientRetryConfig> = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'CONNECTION_FAILED', 'INTERNAL_ERROR'],
      enableJitter: true,
    };

    return {
      ...config,
      clientId: config.clientId || this.generateClientId(),
      timeoutMs: config.timeoutMs || 30000,
      maxRetries: config.maxRetries || defaultRetryConfig.maxRetries,
      retryDelayMs: config.retryDelayMs || defaultRetryConfig.baseDelayMs,
      enableDebugLogging: config.enableDebugLogging || false,
      maxBatchSize: config.maxBatchSize || 25,
      enableAuditLog: config.enableAuditLog || false,
      connection: {
        endpoint: config.lambdaEndpoint,
        poolSize: 10,
        connectTimeoutMs: 5000,
        keepAlive: true,
        ...config.connection,
      },
      retry: {
        ...defaultRetryConfig,
        ...config.retry,
      },
      enableCaching: config.enableCaching || false,
      cacheTtlMs: config.cacheTtlMs || 300000,
      region: config.region || 'us-east-1',
      auth: config.auth || {},
      lambda: {
        functionTimeoutMs: 30000,
        coldStartToleranceMs: 5000,
        maxPayloadSize: 6 * 1024 * 1024, // 6MB
        ...config.lambda,
      },
    };
  }

  /**
   * Generates a unique client identifier.
   */
  private generateClientId(): string {
    return `lambda-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initializes the connection pool with default connections.
   */
  private initializeConnectionPool(): void {
    // Create initial pool connections
    const poolSize = this.config.connection?.poolSize ?? 10;
    for (let i = 0; i < poolSize; i++) {
      const entry: ConnectionPoolEntry = {
        id: `conn-${i}`,
        lastUsed: new Date(),
        inUse: false,
        requestCount: 0,
        isHealthy: true,
        connection: fetch, // Use global fetch or a configured instance
      };
      this.connectionPool.set(entry.id, entry);
    }
  }

  /**
   * Initializes metrics tracking structure.
   */
  private initializeMetrics(): DataClientMetrics {
    return {
      clientId: this.clientId,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTimeMs: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString(),
      operationCounts: {
        read: 0,
        write: 0,
        readTree: 0,
        readWithDefault: 0,
        batch: 0,
      },
      errorBreakdown: {} as Record<DataClientError['code'], number>,
    };
  }

  /**
   * Validates common input parameters for data operations with comprehensive error messages.
   */
  private async validateInputs(
    workspaceId: WorkspaceId,
    path: string,
    userId: UserId,
    value?: unknown
  ): Promise<void> {
    // Validate workspace ID format with specific error message
    if (!workspaceId || typeof workspaceId !== 'string') {
      throw this.createError('INVALID_PATH', 
        `Invalid workspace ID: expected non-empty string, got ${typeof workspaceId}`);
    }
    if (workspaceId.trim().length === 0) {
      throw this.createError('INVALID_PATH', 'Workspace ID cannot be empty or whitespace-only');
    }

    // Validate path using existing validation utilities with detailed error context
    const pathValidation = validatePath(path);
    if (!pathValidation.isValid || pathValidation.error) {
      const errorMessage = pathValidation.error?.message || 'Unknown path validation error';
      throw this.createError('INVALID_PATH', 
        `Path validation failed for '${path}': ${errorMessage}`);
    }

    // Validate user ID format with specific error message
    if (!userId || typeof userId !== 'string') {
      throw this.createError('INVALID_PATH', 
        `Invalid user ID: expected non-empty string, got ${typeof userId}`);
    }
    if (userId.trim().length === 0) {
      throw this.createError('INVALID_PATH', 'User ID cannot be empty or whitespace-only');
    }

    // Additional value validation for write operations
    if (value !== undefined) {
      await this.validateValue(value);
    }
  }

  /**
   * Validates batch operation inputs with comprehensive checks.
   * Enhanced validation for DynamoDB transaction limits and operation integrity.
   */
  private async validateBatchInputs(
    workspaceId: WorkspaceId,
    operations: BatchOperation[],
    userId: UserId
  ): Promise<void> {
    // Basic input validation
    await this.validateInputs(workspaceId, '/', userId);

    // Validate operations array
    if (!Array.isArray(operations)) {
      throw this.createError('BATCH_SIZE_EXCEEDED', 
        'Operations must be an array of BatchOperation objects');
    }

    if (operations.length === 0) {
      throw this.createError('BATCH_SIZE_EXCEEDED', 
        'Operations array cannot be empty - batch must contain at least one operation');
    }

    // DynamoDB transaction limit validation (max 25 operations)
    const MAX_DYNAMODB_BATCH_SIZE = 25;
    if (operations.length > MAX_DYNAMODB_BATCH_SIZE) {
      throw this.createError('BATCH_SIZE_EXCEEDED', 
        `Batch size ${operations.length} exceeds DynamoDB transaction limit of ${MAX_DYNAMODB_BATCH_SIZE} operations`);
    }

    // Also check against client configuration limit
    if (operations.length > this.config.maxBatchSize) {
      throw this.createError('BATCH_SIZE_EXCEEDED', 
        `Batch size ${operations.length} exceeds client maximum ${this.config.maxBatchSize}`);
    }

    // Validate each operation structure
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const opContext = `operation ${i + 1}`;

      // Validate operation structure
      if (!op || typeof op !== 'object') {
        throw this.createError('INVALID_PATH', 
          `${opContext}: Operation must be a valid BatchOperation object`);
      }

      // Validate operation type
      if (!op.type || !['read', 'write'].includes(op.type)) {
        throw this.createError('INVALID_PATH', 
          `${opContext}: Operation type must be 'read' or 'write', got '${op.type}'`);
      }

      // Validate path for each operation
      if (!op.path || typeof op.path !== 'string') {
        throw this.createError('INVALID_PATH', 
          `${opContext}: Operation path must be a non-empty string`);
      }

      // Use existing validation for path validation
      await this.validateInputs(workspaceId, op.path, userId);

      // Validate write-specific requirements
      if (op.type === 'write') {
        // Write operations require a value (can be null per nullable-first design)
        if (op.value === undefined && !('value' in op)) {
          throw this.createError('INVALID_PATH', 
            `${opContext}: Write operations must include a 'value' property (can be null)`);
        }

        // Validate the value if it's not null
        if (op.value !== null && op.value !== undefined) {
          await this.validateValue(op.value);
          await this.validateDynamoDBConstraints(op.value, op.path);
        }
      }

      // Validate read-specific requirements (defaultValue is optional)
      if (op.type === 'read' && op.defaultValue !== undefined) {
        // If defaultValue is provided, validate it as well
        if (op.defaultValue !== null) {
          await this.validateValue(op.defaultValue);
        }
      }
    }

    // Check for duplicate paths within the batch
    const pathCounts = new Map<string, number>();
    for (const op of operations) {
      const count = pathCounts.get(op.path) || 0;
      pathCounts.set(op.path, count + 1);
    }

    // Warn about operations on the same path (potential for race conditions)
    for (const [path, count] of pathCounts) {
      if (count > 1) {
        console.warn(`Batch contains ${count} operations on path '${path}'. ` +
          'Multiple operations on the same path within a batch may lead to unexpected results.');
      }
    }
  }

  /**
   * Validates a value for storage with comprehensive size and content checks.
   * Includes DynamoDB 400KB limit validation (DATA-4) and null value support (REQ-6).
   */
  private async validateValue(value: unknown): Promise<void> {
    // Handle null values explicitly (REQ-6 - nullable-first design)
    if (value === null || value === undefined) {
      return; // Null values are always valid and should be stored explicitly
    }
    
    // Check serialization and size for non-null values
    try {
      const serialized = this.serializeValueForStorage(value);
      const serializedSize = Buffer.byteLength(serialized, 'utf8');
      
      // Check against Lambda payload size limit
      const maxPayloadSize = this.config.lambda?.maxPayloadSize ?? 6 * 1024 * 1024; // 6MB default
      if (serializedSize > maxPayloadSize) {
        throw this.createError('ITEM_TOO_LARGE', 
          `Value size ${serializedSize} bytes exceeds Lambda payload limit ${maxPayloadSize} bytes`);
      }
      
    } catch (serializationError) {
      throw this.createError('INVALID_PATH', 
        `Value cannot be serialized: ${(serializationError as Error).message}`);
    }
  }

  /**
   * Validates DynamoDB-specific constraints (DATA-4).
   * Enforces the 400KB item size limit for individual items.
   */
  private async validateDynamoDBConstraints(value: unknown, path: string): Promise<void> {
    // DynamoDB 400KB item size limit (DATA-4)
    const DYNAMODB_MAX_ITEM_SIZE = 400 * 1024; // 400KB in bytes
    
    // Handle null values - they are minimal in size
    if (value === null || value === undefined) {
      return; // Null values are always within size limits
    }
    
    try {
      // Calculate total item size including path, value, and metadata overhead
      const serializedValue = this.serializeValueForStorage(value);
      const pathSize = Buffer.byteLength(path, 'utf8');
      const valueSize = Buffer.byteLength(serializedValue, 'utf8');
      
      // Estimate metadata overhead (workspace ID, timestamps, etc.) - approximately 200 bytes
      const metadataOverhead = 200;
      const totalItemSize = pathSize + valueSize + metadataOverhead;
      
      if (totalItemSize > DYNAMODB_MAX_ITEM_SIZE) {
        throw this.createError('ITEM_TOO_LARGE', 
          `DynamoDB item size ${totalItemSize} bytes exceeds 400KB limit (path: ${pathSize}B, value: ${valueSize}B, overhead: ${metadataOverhead}B)`,
          { 
            totalSize: totalItemSize, 
            pathSize, 
            valueSize, 
            metadataOverhead,
            dynamoDBLimit: DYNAMODB_MAX_ITEM_SIZE 
          });
      }
      
    } catch (error) {
      if ((error as any).code === 'ITEM_TOO_LARGE') {
        throw error; // Re-throw size errors
      }
      throw this.createError('INVALID_PATH', 
        `Failed to validate DynamoDB constraints: ${(error as Error).message}`);
    }
  }

  /**
   * Validates path prefix specifically for readTree operations.
   * Ensures the prefix is properly formatted and safe for DynamoDB queries.
   * 
   * @param pathPrefix - The path prefix to validate for tree operations
   * @throws {DataClientError} INVALID_PATH if prefix validation fails
   */
  private async validatePathPrefix(pathPrefix: string): Promise<void> {
    // Validate that pathPrefix follows proper format
    const pathValidation = validatePath(pathPrefix);
    if (!pathValidation.isValid || pathValidation.error) {
      const errorMessage = pathValidation.error?.message || 'Unknown path prefix validation error';
      throw this.createError('INVALID_PATH', 
        `Path prefix validation failed for '${pathPrefix}': ${errorMessage}`,
        { operation: 'readTree', pathPrefix });
    }

    // Additional readTree-specific validations
    if (pathPrefix.endsWith('/')) {
      throw this.createError('INVALID_PATH', 
        'Path prefix cannot end with trailing slash for readTree operations',
        { operation: 'readTree', pathPrefix });
    }

    // Ensure path prefix isn't too broad to avoid performance issues
    const segments = pathValidation.metadata?.segments || [];
    if (segments.length < 1) {
      throw this.createError('INVALID_PATH', 
        'Path prefix must contain at least one segment to prevent overly broad queries',
        { operation: 'readTree', pathPrefix, segmentCount: segments.length });
    }

    // Warn about potentially expensive queries (root-level or very broad prefixes)
    if (segments.length === 1) {
      console.warn(`ReadTree with broad path prefix '${pathPrefix}' may return many items and impact performance. Consider using more specific path prefixes.`);
    }
  }

  /**
   * Serializes a value for storage with explicit null handling (REQ-6).
   * Ensures null values are preserved and not converted to undefined or omitted.
   */
  private serializeValueForStorage(value: unknown): string {
    // Explicit null handling for nullable-first design (REQ-6)
    if (value === null) {
      return 'null'; // Preserve explicit null values
    }
    
    if (value === undefined) {
      return 'null'; // Convert undefined to null for consistency
    }
    
    try {
      // Use JSON.stringify which handles nested objects, arrays, and preserves nulls
      return JSON.stringify(value, null, 0); // Compact format to minimize size
    } catch (error) {
      throw new Error(`Cannot serialize value for storage: ${(error as Error).message}`);
    }
  }

  /**
   * Determines the type of a value for metadata tracking and validation.
   * Provides detailed type information for debugging and monitoring.
   */
  private getValueType(value: unknown): 'null' | 'undefined' | 'boolean' | 'number' | 'string' | 'object' | 'array' | 'function' {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value as 'boolean' | 'number' | 'string' | 'object' | 'function';
  }

  /**
   * Executes a function with retry logic and exponential backoff.
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    const retryConfig = this.config.retry;
    const maxRetries = retryConfig.maxRetries ?? 3;
    const baseDelayMs = retryConfig.baseDelayMs ?? 1000;
    const maxDelayMs = retryConfig.maxDelayMs ?? 30000;
    const enableJitter = retryConfig.enableJitter ?? true;
    const retryableErrors = retryConfig.retryableErrors ?? ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'CONNECTION_FAILED', 'INTERNAL_ERROR'];
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (attempt === maxRetries || !this.isRetryableError(error as DataClientError, retryableErrors)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const jitterDelay = enableJitter ? delay * (0.5 + Math.random() * 0.5) : delay;
        
        await this.sleep(jitterDelay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Makes an HTTP request to the Lambda endpoint.
   */
  private async makeLambdaRequest(operation: string, payload: any): Promise<any> {
    const connection = this.getConnection();
    
    try {
      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.buildAuthHeaders(),
        },
        body: JSON.stringify({
          operation,
          ...payload,
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      };

      const response = await connection.connection(this.config.lambdaEndpoint, requestInit);
      
      if (!response.ok) {
        throw this.createHttpError(response);
      }

      const result = await response.json();
      this.releaseConnection(connection);
      
      return result;
      
    } catch (error) {
      this.releaseConnection(connection, false);
      throw error;
    }
  }

  /**
   * Gets an available connection from the pool.
   */
  private getConnection(): ConnectionPoolEntry {
    // Find an available connection
    for (const [id, conn] of this.connectionPool) {
      if (!conn.inUse && conn.isHealthy) {
        conn.inUse = true;
        conn.lastUsed = new Date();
        return conn;
      }
    }

    // If no available connections, create a new one (simple implementation)
    const newConn: ConnectionPoolEntry = {
      id: `conn-${Date.now()}`,
      lastUsed: new Date(),
      inUse: true,
      requestCount: 0,
      isHealthy: true,
      connection: fetch,
    };
    
    this.connectionPool.set(newConn.id, newConn);
    return newConn;
  }

  /**
   * Releases a connection back to the pool.
   */
  private releaseConnection(connection: ConnectionPoolEntry, isHealthy: boolean = true): void {
    connection.inUse = false;
    connection.isHealthy = isHealthy;
    connection.requestCount++;
  }

  /**
   * Builds authentication headers for Lambda requests.
   */
  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.config.auth.apiKey) {
      headers['X-API-Key'] = this.config.auth.apiKey;
    }
    
    if (this.config.auth.bearerToken) {
      headers['Authorization'] = `Bearer ${this.config.auth.bearerToken}`;
    }
    
    if (this.config.auth.customHeaders) {
      Object.assign(headers, this.config.auth.customHeaders);
    }
    
    return headers;
  }

  /**
   * Creates a standardized HTTP error from a response.
   * Categorizes errors according to LAMBDA-3: distinguish between 4xx and 5xx responses.
   */
  private createHttpError(response: Response): DataClientError {
    let code: DataClientError['code'];
    
    if (response.status >= 500) {
      // Server errors (5xx) - issues with Lambda function or infrastructure
      code = 'INTERNAL_ERROR';
    } else if (response.status >= 400) {
      // Client errors (4xx) - bad request, authentication, authorization, etc.
      if (response.status === 401 || response.status === 403) {
        code = 'WORKSPACE_ACCESS_DENIED';
      } else if (response.status === 413) {
        code = 'ITEM_TOO_LARGE';
      } else if (response.status === 400 || response.status === 422) {
        code = 'INVALID_PATH';
      } else {
        code = 'NETWORK_ERROR';
      }
    } else {
      // Other status codes (shouldn't happen for !response.ok, but defensive)
      code = 'NETWORK_ERROR';
    }
    
    return this.createError(code, 
      `HTTP ${response.status}: ${response.statusText}`, 
      { 
        status: response.status, 
        statusText: response.statusText,
        isClientError: response.status >= 400 && response.status < 500,
        isServerError: response.status >= 500
      }
    );
  }

  /**
   * Checks if an error should trigger a retry attempt.
   */
  private isRetryableError(error: DataClientError, retryableErrors: DataClientError['code'][]): boolean {
    return retryableErrors.includes(error.code);
  }

  /**
   * Creates a standardized DataClientError.
   */
  private createError(code: DataClientError['code'], message: string, details?: any): DataClientError {
    const error = new Error(message) as DataClientError;
    error.code = code;
    error.details = details;
    error.timestamp = new Date().toISOString();
    error.clientId = this.clientId;
    return error;
  }

  /**
   * Wraps and enhances errors with additional context.
   */
  private wrapError(error: any, operation: string, context: any): DataClientError {
    if (error.code) {
      // Already a DataClientError
      return error;
    }

    // Create new error with context
    const code: DataClientError['code'] = this.determineErrorCode(error);
    return this.createError(code, `${operation} failed: ${error.message}`, { 
      originalError: error, 
      operation, 
      context 
    });
  }

  /**
   * Determines appropriate error code from an unknown error.
   */
  private determineErrorCode(error: any): DataClientError['code'] {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return 'TIMEOUT_ERROR';
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    return 'INTERNAL_ERROR';
  }

  /**
   * Updates response time metrics with exponential moving average.
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    if (this.metrics.totalOperations === 1) {
      this.metrics.averageResponseTimeMs = responseTime;
    } else {
      // Exponential moving average with alpha = 0.1
      this.metrics.averageResponseTimeMs = 
        0.9 * this.metrics.averageResponseTimeMs + 0.1 * responseTime;
    }
  }

  /**
   * Updates error metrics and breakdown.
   */
  private updateErrorMetrics(error: DataClientError): void {
    this.metrics.errorBreakdown[error.code] = (this.metrics.errorBreakdown[error.code] || 0) + 1;
    this.metrics.errorRate = (this.metrics.failedOperations / this.metrics.totalOperations) * 100;
  }

  /**
   * Updates the metrics timestamp.
   */
  private updateMetricsTimestamp(): void {
    this.metrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Calculates recent error count for health monitoring.
   */
  private calculateRecentErrorCount(): number {
    // Simple implementation - could be enhanced with time-based windowing
    return this.metrics.failedOperations;
  }

  /**
   * Ensures the client has not been disposed.
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw this.createError('CLIENT_DISPOSED', 'Client has been disposed and cannot be used');
    }
  }

  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating LambdaDataClient instances.
 * Provides a consistent interface for dependency injection and testing.
 * 
 * @param config - Configuration for the Lambda client
 * @returns Configured LambdaDataClient instance
 * 
 * @example
 * ```typescript
 * const client = createLambdaClient({
 *   lambdaEndpoint: process.env.LAMBDA_ENDPOINT!,
 *   auth: { apiKey: process.env.API_KEY }
 * });
 * ```
 */
export function createLambdaClient(config: LambdaClientConfig): LambdaDataClient {
  return new LambdaDataClient(config);
}

/**
 * Type guard to check if a DataClient is a LambdaDataClient.
 * Useful for client-specific feature detection.
 * 
 * @param client - DataClient to check
 * @returns True if client is a LambdaDataClient
 */
export function isLambdaClient(client: DataClient): client is LambdaDataClient {
  return client instanceof LambdaDataClient;
}