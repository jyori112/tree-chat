/**
 * Core Data Access Interfaces - Data Infrastructure
 * 
 * This file defines the foundational interfaces for the path-based data access
 * infrastructure that supports hierarchical data storage with workspace-level
 * partitioning and nullable-first design philosophy.
 * 
 * @see Requirements: REQ-1, REQ-4, REQ-6
 */

import type { SessionContext } from './session-context';

/**
 * Generic response wrapper for all data operations.
 * Provides consistent error handling and type safety across the data access layer.
 * 
 * @template T - The type of data being returned
 */
export interface DataResponse<T> {
  /** The requested data, or null if not found */
  data: T | null;
  /** Error message if the operation failed */
  error?: string;
  /** Error code for programmatic error handling */
  errorCode?: string;
  /** Timestamp of the operation (ISO string) */
  timestamp: string;
}

/**
 * Response type for tree-based data retrieval operations.
 * Returns a flat key-value structure representing the hierarchical data.
 */
export interface TreeResponse {
  /** Key-value pairs where keys are full paths and values are the stored data */
  data: Record<string, any>;
  /** Total number of items retrieved */
  count: number;
  /** The path prefix that was queried */
  pathPrefix: string;
  /** Timestamp of the operation (ISO string) */
  timestamp: string;
}

/**
 * Represents a single operation in a batch transaction.
 * All operations within a batch are executed atomically.
 */
export interface BatchOperation {
  /** Type of operation to perform */
  type: 'read' | 'write';
  /** Full path to the data item */
  path: string;
  /** Value to write (required for write operations, ignored for read operations) */
  value?: any;
  /** Optional default value to return if path doesn't exist (read operations only) */
  defaultValue?: any;
}

/**
 * Core data client interface providing generic CRUD operations using hierarchical paths.
 * Implementations must handle workspace-level partitioning and nullable-first design.
 * 
 * All methods operate on paths without knowledge of specific domain entities
 * (sessions, pages, etc.), enabling flexible and scalable data access patterns.
 */
export interface DataClient {
  /**
   * Read a single value from the specified path.
   * 
   * @param workspaceId - The workspace identifier for data partitioning
   * @param path - Hierarchical path to the data item (e.g., "/sessions/123/metadata")
   * @param userId - User identifier for audit logging
   * @returns Promise resolving to the stored value or null if not found
   * 
   * @example
   * ```typescript
   * const metadata = await client.read("ws-123", "/sessions/456/metadata", "user-789");
   * // Returns: { title: "My Session", createdAt: "2023-01-01" } or null
   * ```
   */
  read(workspaceId: string, path: string, userId: string): Promise<any>;

  /**
   * Write a value to the specified path.
   * Supports null values as part of the nullable-first design philosophy.
   * 
   * @param workspaceId - The workspace identifier for data partitioning
   * @param path - Hierarchical path where the data should be stored
   * @param value - Value to store (can be null, objects, arrays, primitives)
   * @param userId - User identifier for audit logging
   * @returns Promise that resolves when the write operation completes
   * 
   * @example
   * ```typescript
   * await client.write("ws-123", "/sessions/456/metadata", { title: "Updated Title" }, "user-789");
   * await client.write("ws-123", "/sessions/456/deleted", null, "user-789"); // Explicit null
   * ```
   */
  write(workspaceId: string, path: string, value: any, userId: string): Promise<void>;

  /**
   * Read all data items under a specified path prefix.
   * Returns a flat structure of path-value pairs for efficient tree traversal.
   * 
   * @param workspaceId - The workspace identifier for data partitioning
   * @param pathPrefix - Path prefix to query (e.g., "/sessions/456" returns all data under that session)
   * @param userId - User identifier for audit logging
   * @returns Promise resolving to a key-value record of all matching paths and their values
   * 
   * @example
   * ```typescript
   * const sessionData = await client.readTree("ws-123", "/sessions/456", "user-789");
   * // Returns: {
   * //   "/sessions/456/metadata": { title: "My Session" },
   * //   "/sessions/456/pages/page1/content": { text: "Hello" },
   * //   "/sessions/456/pages/page1/framework": "lean-canvas"
   * // }
   * ```
   */
  readTree(workspaceId: string, pathPrefix: string, userId: string): Promise<Record<string, any>>;

  /**
   * Read a value with a fallback default if the path doesn't exist or contains null.
   * Provides convenient null handling as part of the nullable-first design.
   * 
   * @param workspaceId - The workspace identifier for data partitioning
   * @param path - Hierarchical path to the data item
   * @param defaultValue - Value to return if path doesn't exist or is null
   * @param userId - User identifier for audit logging
   * @returns Promise resolving to the stored value or the default value
   * 
   * @example
   * ```typescript
   * const config = await client.readWithDefault("ws-123", "/settings/theme", "light", "user-789");
   * // Returns stored theme or "light" if not set
   * ```
   */
  readWithDefault(workspaceId: string, path: string, defaultValue: any, userId: string): Promise<any>;

  /**
   * Execute multiple operations atomically within a single transaction.
   * All operations must succeed or the entire batch is rolled back.
   * 
   * @param workspaceId - The workspace identifier for data partitioning
   * @param operations - Array of operations to execute atomically (max 25 items for DynamoDB compatibility)
   * @param userId - User identifier for audit logging
   * @returns Promise resolving to an array of results for each operation (null for write operations)
   * 
   * @throws Error if batch size exceeds DynamoDB transaction limit (25 items)
   * @throws Error if any operation in the batch fails, causing full rollback
   * 
   * @example
   * ```typescript
   * const results = await client.batch("ws-123", [
   *   { type: 'read', path: '/sessions/456/metadata' },
   *   { type: 'write', path: '/sessions/456/updated_at', value: new Date().toISOString() },
   *   { type: 'read', path: '/sessions/456/pages/page1/content', defaultValue: {} }
   * ], "user-789");
   * // Returns: [{ title: "Session" }, null, { text: "content" } or {}]
   * ```
   */
  batch(workspaceId: string, operations: BatchOperation[], userId: string): Promise<any[]>;
}


/**
 * Configuration options for data client implementations.
 * Provides tuning parameters for performance and reliability.
 */
export interface DataClientConfig {
  /** Maximum number of retry attempts for failed operations */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff */
  retryDelayMs?: number;
  /** Timeout in milliseconds for individual operations */
  timeoutMs?: number;
  /** Enable debug logging for troubleshooting */
  enableDebugLogging?: boolean;
}

/**
 * Error types for data access operations.
 * Provides structured error handling across the data infrastructure.
 */
export interface DataAccessError extends Error {
  /** Specific error code for programmatic handling */
  code: 'INVALID_PATH' | 'WORKSPACE_ACCESS_DENIED' | 'BATCH_SIZE_EXCEEDED' | 
        'ITEM_TOO_LARGE' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'INTERNAL_ERROR';
  /** Original error details for debugging */
  details?: any;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Path that caused the error, if applicable */
  path?: string;
  /** Workspace ID involved in the error */
  workspaceId?: string;
}

/**
 * Validation result for path and value operations.
 * Used internally for input validation before data operations.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Specific field that failed validation, if applicable */
  field?: string;
}

/**
 * Audit information for data operations.
 * Provides comprehensive logging for security and debugging purposes.
 */
export interface AuditLog {
  /** Unique identifier for the operation */
  operationId: string;
  /** Type of operation performed */
  operation: 'read' | 'write' | 'readTree' | 'batch';
  /** User who performed the operation */
  userId: string;
  /** Workspace where the operation occurred */
  workspaceId: string;
  /** Path(s) involved in the operation */
  paths: string[];
  /** Timestamp of the operation (ISO string) */
  timestamp: string;
  /** Success status of the operation */
  success: boolean;
  /** Error details if operation failed */
  error?: string;
  /** Duration of the operation in milliseconds */
  durationMs: number;
}