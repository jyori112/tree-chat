/**
 * Lambda Data Read Function - Entry Point for SAM Local
 * 
 * This file serves as the deployment entry point for AWS SAM.
 * It imports and re-exports the main handler from the shared package.
 */

// Import the handler from the shared package
const { dataReadHandler } = require('@tree-chat/shared/infrastructure/lambda/shared');

/**
 * AWS Lambda handler for data read operations
 * 
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
  return await dataReadHandler(event, context);
};

/**
 * Handler for readWithDefault operations
 * 
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handlerWithDefault = async (event, context) => {
  // Add operation type to event for readWithDefault
  const enhancedEvent = {
    ...event,
    body: event.body ? JSON.stringify({
      ...JSON.parse(event.body || '{}'),
      operation: 'readWithDefault'
    }) : JSON.stringify({ operation: 'readWithDefault' })
  };
  
  return await dataReadHandler(enhancedEvent, context);
};