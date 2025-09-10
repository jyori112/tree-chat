/**
 * Data client implementations
 * 
 * This module exports all available DataClient implementations.
 * Currently provides Lambda-based implementation with future extensibility
 * for additional implementations (DynamoDB direct, in-memory, etc.).
 */

// Export the main Lambda implementation
export {
  LambdaDataClient,
  createLambdaClient,
  isLambdaClient,
  type LambdaClientConfig
} from '../lambda-client.js';