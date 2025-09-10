/**
 * DataClient Type Definitions - Data Infrastructure
 * 
 * This module provides the abstract DataClient interface and supporting types
 * for implementing path-based data access with workspace-level partitioning.
 * 
 * The DataClient interface is the primary abstraction that enables:
 * - Generic CRUD operations using hierarchical path strings (REQ-1)
 * - Workspace-level data partitioning for security and scalability (REQ-2)
 * - Efficient tree-based data access patterns (REQ-3)
 * - Atomic batch operations (REQ-4)
 * - Nullable-first data handling with graceful defaults (REQ-6)
 * 
 * @see Requirements: REQ-1, REQ-2, REQ-3, REQ-4, REQ-6
 * @packageDocumentation
 */

// Import types for use in interface definitions
import type {
  // Core data access interfaces
  DataClient,
  DataResponse,
  TreeResponse,
  BatchOperation,
  DataClientConfig,
  DataAccessError,
  ValidationResult,
  AuditLog,
  
  // Session and workspace types
  SessionContext,
  WorkspaceId,
  UserId,
  SecureSessionContext,
  WorkspaceValidationContext,
  WorkspaceAccessContext,
  
  // Validation types
  ValidationError,
  ValidationErrorCode,
  ValidationSeverity,
  PathValidationResult,
  ValueValidationResult,
  SecurityConstraints,
  ValidatedPath,
  ValidatedValue,
  ValidatedWorkspaceId,
  PathValidationConfig,
  ValidationContext,
  BatchValidationResult
} from '@tree-chat/shared';

// Re-export all shared types for convenient access
export type {
  // Core data access interfaces
  DataClient,
  DataResponse,
  TreeResponse,
  BatchOperation,
  DataClientConfig,
  DataAccessError,
  ValidationResult,
  AuditLog,
  
  // Session and workspace types
  SessionContext,
  WorkspaceId,
  UserId,
  SecureSessionContext,
  WorkspaceValidationContext,
  WorkspaceAccessContext,
  
  // Validation types
  ValidationError,
  ValidationErrorCode,
  ValidationSeverity,
  PathValidationResult,
  ValueValidationResult,
  SecurityConstraints,
  ValidatedPath,
  ValidatedValue,
  ValidatedWorkspaceId,
  PathValidationConfig,
  ValidationContext,
  BatchValidationResult
};

/**
 * Client-specific error types for data operations.
 * Extends the base DataAccessError with client implementation details.
 */
export interface DataClientError extends Error {
  /** Specific error code for programmatic handling */
  code: 'CONNECTION_FAILED' | 'CLIENT_TIMEOUT' | 'INVALID_CLIENT_CONFIG' | 
        'CLIENT_NOT_INITIALIZED' | 'CLIENT_DISPOSED' | 'RETRY_EXHAUSTED' | 
        'INVALID_PATH' | 'WORKSPACE_ACCESS_DENIED' | 'BATCH_SIZE_EXCEEDED' | 
        'ITEM_TOO_LARGE' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'INTERNAL_ERROR';
  /** Original error details for debugging */
  details?: any;
  /** Timestamp when the error occurred (ISO string) */
  timestamp: string;
  /** Path that caused the error, if applicable */
  path?: string;
  /** Workspace ID involved in the error */
  workspaceId?: string;
  /** Number of retry attempts made before failure */
  retryCount?: number;
  /** Client instance identifier for debugging */
  clientId?: string;
}

/**
 * Configuration for DataClient retry behavior and error handling.
 * Provides fine-grained control over client resilience patterns.
 */
export interface ClientRetryConfig {
  /** Maximum number of retry attempts for transient failures (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds to cap exponential backoff (default: 30000) */
  maxDelayMs: number;
  /** Error codes that should trigger retry attempts */
  retryableErrors: DataClientError['code'][];
  /** Enable jitter in backoff timing to avoid thundering herd (default: true) */
  enableJitter: boolean;
}

/**
 * Extended configuration for DataClient implementations with client-specific options.
 * Combines base configuration with client-specific retry and connection settings.
 */
export interface ExtendedDataClientConfig extends DataClientConfig {
  /** Unique identifier for this client instance (auto-generated if not provided) */
  clientId?: string;
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
  /** Enable client-side caching (if supported by implementation) */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTtlMs?: number;
}

/**
 * Factory function signature for creating DataClient instances.
 * Enables dependency injection and testing with different implementations.
 * 
 * @example
 * ```typescript
 * // DynamoDB implementation factory
 * const createDynamoClient: DataClientFactory = (config) => {
 *   return new DynamoDbDataClient(config);
 * };
 * 
 * // In-memory implementation for testing
 * const createMemoryClient: DataClientFactory = (config) => {
 *   return new InMemoryDataClient(config);
 * };
 * ```
 */
export type DataClientFactory = (config: ExtendedDataClientConfig) => DataClient;

/**
 * Health check result for DataClient instances.
 * Provides monitoring and diagnostic information for client health.
 */
export interface ClientHealthCheck {
  /** Whether the client is healthy and ready to serve requests */
  isHealthy: boolean;
  /** Timestamp of the health check (ISO string) */
  timestamp: string;
  /** Response time in milliseconds for health check operation */
  responseTimeMs: number;
  /** Error message if health check failed */
  error?: string;
  /** Additional diagnostic information */
  details?: {
    /** Connection status to underlying data store */
    connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
    /** Number of active connections (if applicable) */
    activeConnections?: number;
    /** Last successful operation timestamp */
    lastSuccessfulOperation?: string;
    /** Error count in the last monitoring window */
    recentErrorCount?: number;
  };
}

/**
 * Monitoring and metrics interface for DataClient implementations.
 * Provides observability into client performance and reliability.
 */
export interface DataClientMetrics {
  /** Client instance identifier */
  clientId: string;
  /** Total number of operations performed since startup */
  totalOperations: number;
  /** Number of successful operations */
  successfulOperations: number;
  /** Number of failed operations */
  failedOperations: number;
  /** Average response time in milliseconds */
  averageResponseTimeMs: number;
  /** Current error rate as a percentage (0-100) */
  errorRate: number;
  /** Timestamp when metrics were last updated (ISO string) */
  lastUpdated: string;
  /** Breakdown of operations by type */
  operationCounts: {
    read: number;
    write: number;
    readTree: number;
    readWithDefault: number;
    batch: number;
  };
  /** Recent error breakdown by error code */
  errorBreakdown: Record<DataClientError['code'], number>;
}

/**
 * Extended DataClient interface with additional client management capabilities.
 * Provides lifecycle management, health monitoring, and metrics collection.
 * 
 * This interface extends the core DataClient with operational capabilities
 * that are essential for production deployments but not part of the core
 * data access patterns.
 */
export interface ManagedDataClient extends DataClient {
  /**
   * Get the client configuration used to initialize this instance.
   * Useful for debugging and runtime introspection.
   * 
   * @returns The configuration object used to create this client
   * 
   * @example
   * ```typescript
   * const config = client.getConfig();
   * console.log(`Client timeout: ${config.timeoutMs}ms`);
   * console.log(`Max retries: ${config.retry?.maxRetries ?? 3}`);
   * ```
   */
  getConfig(): ExtendedDataClientConfig;

  /**
   * Perform a health check on the client and its underlying connections.
   * Should be called periodically to ensure client readiness.
   * 
   * @returns Promise resolving to health check results
   * 
   * @example
   * ```typescript
   * const health = await client.healthCheck();
   * if (!health.isHealthy) {
   *   console.error(`Client unhealthy: ${health.error}`);
   *   // Trigger client restart or failover
   * }
   * ```
   */
  healthCheck(): Promise<ClientHealthCheck>;

  /**
   * Get current metrics and performance statistics for this client.
   * Useful for monitoring, alerting, and performance analysis.
   * 
   * @returns Current metrics snapshot
   * 
   * @example
   * ```typescript
   * const metrics = client.getMetrics();
   * console.log(`Success rate: ${100 - metrics.errorRate}%`);
   * console.log(`Average response time: ${metrics.averageResponseTimeMs}ms`);
   * 
   * // Alert if error rate is too high
   * if (metrics.errorRate > 5) {
   *   alerting.sendAlert('High error rate detected', metrics);
   * }
   * ```
   */
  getMetrics(): DataClientMetrics;

  /**
   * Gracefully dispose of the client and clean up resources.
   * Should be called during application shutdown or client replacement.
   * 
   * @returns Promise that resolves when cleanup is complete
   * 
   * @example
   * ```typescript
   * // Application shutdown
   * process.on('SIGTERM', async () => {
   *   await client.dispose();
   *   process.exit(0);
   * });
   * 
   * // Replace client with new configuration
   * await oldClient.dispose();
   * const newClient = createClient(newConfig);
   * ```
   */
  dispose(): Promise<void>;
}

/**
 * Type guard to check if a DataClient implements the ManagedDataClient interface.
 * Useful for conditional feature usage based on client capabilities.
 * 
 * @param client - DataClient instance to check
 * @returns True if the client supports management operations
 * 
 * @example
 * ```typescript
 * if (isManagedClient(client)) {
 *   // Can use health check and metrics
 *   const metrics = client.getMetrics();
 *   const health = await client.healthCheck();
 * } else {
 *   // Basic client - only core operations available
 *   console.warn('Using basic client without health monitoring');
 * }
 * ```
 */
export function isManagedClient(client: DataClient): client is ManagedDataClient {
  return 'healthCheck' in client && 
         'getMetrics' in client && 
         'dispose' in client &&
         'getConfig' in client;
}

/**
 * Utility type for extracting the value type from a DataResponse.
 * Helpful for type inference in generic client operations.
 * 
 * @template T - The DataResponse type to extract from
 * 
 * @example
 * ```typescript
 * type SessionMetadata = { title: string; createdAt: string };
 * type Response = DataResponse<SessionMetadata>;
 * type ExtractedValue = ExtractDataValue<Response>; // SessionMetadata | null
 * ```
 */
export type ExtractDataValue<T> = T extends DataResponse<infer U> ? U : never;

/**
 * Utility type for creating strongly-typed path strings.
 * Helps prevent path-related errors at compile time.
 * 
 * @example
 * ```typescript
 * type SessionPaths = 
 *   | DataPath<'/sessions/{sessionId}/metadata'>
 *   | DataPath<'/sessions/{sessionId}/pages/{pageId}/content'>
 *   | DataPath<'/sessions/{sessionId}/pages/{pageId}/framework'>;
 * 
 * // Usage with type safety
 * const readSessionMetadata = (client: DataClient, workspaceId: string, sessionId: string) => {
 *   const path: SessionPaths = `/sessions/${sessionId}/metadata`;
 *   return client.read(workspaceId, path, userId);
 * };
 * ```
 */
export type DataPath<T extends string = string> = T & { readonly __brand: 'DataPath' };

/**
 * Helper function to create type-safe data paths.
 * Provides runtime validation while maintaining compile-time type safety.
 * 
 * @param path - The path string to validate and type
 * @returns Typed path string
 * @throws Error if path format is invalid
 * 
 * @example
 * ```typescript
 * // Type-safe path creation
 * const sessionPath = createDataPath('/sessions/123/metadata');
 * const pagePath = createDataPath('/sessions/123/pages/456/content');
 * 
 * // Runtime validation prevents errors
 * const invalidPath = createDataPath('invalid-path'); // throws Error
 * ```
 */
export function createDataPath<T extends string>(path: T): DataPath<T> {
  // Basic validation - paths must start with / and not be empty
  if (!path.startsWith('/') || path.length === 1) {
    throw new Error(`Invalid data path format: ${path}. Paths must start with '/' and contain at least one segment.`);
  }
  
  // Check for invalid characters or patterns
  if (path.includes('//') || path.endsWith('/')) {
    throw new Error(`Invalid data path format: ${path}. Paths cannot contain double slashes or end with '/'.`);
  }
  
  return path as DataPath<T>;
}