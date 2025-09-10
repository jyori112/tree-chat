/**
 * @tree-chat/data-client
 * 
 * Data access layer for Tree Chat application
 * Provides type-safe client interfaces and utilities for data operations
 * 
 * This package implements the DataClient interface with robust Lambda-based data access,
 * comprehensive validation, workspace boundary enforcement, and production-ready
 * error handling and retry mechanisms.
 * 
 * @packageDocumentation
 */

// ==================== Core Client Implementation ====================

// Export the main LambdaDataClient class and factory functions
export {
  LambdaDataClient,
  createLambdaClient,
  isLambdaClient
} from './lambda-client.js';

// Export Lambda-specific configuration types
export type {
  LambdaClientConfig
} from './lambda-client.js';

// ==================== Type Exports ====================

// Re-export all shared types for convenient access
export type * from './types/index.js';

// Re-export commonly used types for direct import convenience
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
  
  // Extended client types
  DataClientError,
  ClientRetryConfig,
  ExtendedDataClientConfig,
  DataClientFactory,
  ClientHealthCheck,
  DataClientMetrics,
  ManagedDataClient,
  
  // Utility types
  ExtractDataValue,
  DataPath
} from './types/index.js';

// Export type guards and helper functions
export {
  isManagedClient,
  createDataPath
} from './types/index.js';

// ==================== Validation Utilities ====================

// Export all validation functions and utilities
export {
  validatePath,
  validateWorkspaceBoundary,
  normalizePath,
  createPathValidator,
  getPathSegments,
  getPathByteLength,
  isPathWithinSizeLimit,
  createValidatedPath
} from './validation.js';

// Export workspace validation utilities
export {
  validateWorkspaceId,
  validateSessionContext,
  validateWorkspaceBoundaryAccess,
  createWorkspacePathValidator,
  isValidWorkspaceResult,
  extractWorkspaceIdFromPath,
  getSecurityLogger
} from './workspace-validator.js';

// Export workspace validation types
export type {
  WorkspaceValidationResult,
  WorkspaceValidatorConfig,
  WorkspaceSecurityLog
} from './workspace-validator.js';

// ==================== Utility Re-exports ====================

// Re-export all utilities (includes validation utilities above)
export * from './utils/index.js';

// ==================== Convenience Factory Functions ====================

import { LambdaDataClient, type LambdaClientConfig } from './lambda-client.js';
import type { ExtendedDataClientConfig, DataClient, DataClientFactory } from './types/index.js';

/**
 * Convenient factory function for creating DataClient instances.
 * Provides a consistent interface for dependency injection and supports
 * different implementation strategies.
 * 
 * Currently supports Lambda-based data client implementation.
 * Future implementations (DynamoDB direct, in-memory, etc.) can be added here.
 * 
 * @param config - Configuration for the data client
 * @returns Configured DataClient instance
 * 
 * @example
 * ```typescript
 * // Create a Lambda-based client
 * const client = createDataClient({
 *   lambdaEndpoint: 'https://api.example.com/data',
 *   auth: { apiKey: process.env.API_KEY },
 *   timeoutMs: 10000,
 *   retry: {
 *     maxRetries: 3,
 *     baseDelayMs: 1000
 *   }
 * });
 * 
 * // Use the client for data operations
 * const result = await client.read('workspace-123', '/sessions/456/metadata', 'user-789');
 * ```
 */
export function createDataClient(config: LambdaClientConfig): DataClient {
  // Currently only supports Lambda implementation
  // Future implementations can be selected based on config properties or environment
  return new LambdaDataClient(config);
}

/**
 * Factory function signature that matches the DataClientFactory type.
 * Enables dependency injection patterns and testing with different configurations.
 * 
 * @example
 * ```typescript
 * // Use as a factory in dependency injection
 * const dataClientFactory: DataClientFactory = (config) => createDataClient(config);
 * 
 * // In service registration
 * container.register('dataClient', () => dataClientFactory(config));
 * ```
 */
export const dataClientFactory: DataClientFactory = (config: ExtendedDataClientConfig): DataClient => {
  // Map ExtendedDataClientConfig to LambdaClientConfig
  // This provides compatibility between the generic factory interface
  // and the specific Lambda implementation
  const lambdaConfig: LambdaClientConfig = {
    ...config,
    // Default to localhost Lambda endpoint if not specified
    lambdaEndpoint: config.connection?.endpoint || 'http://localhost:2024',
  };
  
  return createDataClient(lambdaConfig);
};

/**
 * Type guard to check if a client configuration is for Lambda implementation.
 * Useful for configuration validation and type narrowing.
 * 
 * @param config - Configuration to check
 * @returns True if config is for Lambda client
 */
export function isLambdaClientConfig(config: ExtendedDataClientConfig): config is LambdaClientConfig {
  return 'lambdaEndpoint' in config || 
         (config.connection?.endpoint !== undefined && 
          (config.connection.endpoint.includes('lambda') || 
           config.connection.endpoint.includes('amazonaws')));
}