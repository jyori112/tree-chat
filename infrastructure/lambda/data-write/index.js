/**
 * Lambda Data Write Function - Entry Point for SAM Local
 * 
 * This file serves as the deployment entry point for AWS SAM.
 * It imports and re-exports the main handler from the shared package.
 */

// Import the handler from the shared package
const { dataWriteHandler } = require('@tree-chat/shared/infrastructure/lambda/shared');

/**
 * AWS Lambda handler for data write operations
 * 
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @returns {Promise<Object>} HTTP response object
 */
exports.handler = async (event, context) => {
  return await dataWriteHandler(event, context);
};