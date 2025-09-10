/**
 * Example usage patterns for the Enhanced DynamoDB Client
 * This file demonstrates common patterns for Lambda functions
 */

import { getDynamoDBClient, EnhancedDynamoDBClient } from './dynamodb-client';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Example: Basic CRUD operations in a Lambda function
 */
export const exampleCrudHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const dynamodb = getDynamoDBClient({
    enableLogging: true,
  });

  try {
    const { httpMethod, pathParameters, body } = event;
    const tableName = process.env['DYNAMODB_TABLE'] || 'ChatSessions';
    const id = pathParameters?.['id'];

    switch (httpMethod) {
      case 'GET': {
        if (!id) {
          // Scan all items (with pagination)
          const result = await dynamodb.scan({
            TableName: tableName,
            Limit: 50,
            ExclusiveStartKey: event.queryStringParameters?.['lastKey'] ? 
              JSON.parse(decodeURIComponent(event.queryStringParameters['lastKey'])) : 
              undefined,
          });

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              items: result.Items,
              lastKey: result.LastEvaluatedKey ? 
                encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : 
                null,
            }),
          };
        }

        // Get specific item
        const result = await dynamodb.get({
          TableName: tableName,
          Key: { id },
        });

        if (!result.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Item not found' }),
          };
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(result.Item),
        };
      }

      case 'POST': {
        if (!body) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Request body is required' }),
          };
        }

        const item = JSON.parse(body);
        const now = new Date().toISOString();

        await dynamodb.put({
          TableName: tableName,
          Item: {
            ...item,
            id: id || `session_${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          },
          ConditionExpression: 'attribute_not_exists(id)', // Prevent overwrites
        });

        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Item created successfully' }),
        };
      }

      case 'PUT': {
        if (!id || !body) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'ID and request body are required' }),
          };
        }

        const updates = JSON.parse(body);
        const updateExpression = Object.keys(updates)
          .map(key => `#${key} = :${key}`)
          .join(', ');
        
        const expressionAttributeNames = Object.keys(updates)
          .reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {});
        
        const expressionAttributeValues = Object.keys(updates)
          .reduce((acc, key) => ({ ...acc, [`:${key}`]: updates[key] }), {
            ':updatedAt': new Date().toISOString(),
          });

        await dynamodb.update({
          TableName: tableName,
          Key: { id },
          UpdateExpression: `SET ${updateExpression}, #updatedAt = :updatedAt`,
          ExpressionAttributeNames: {
            ...expressionAttributeNames,
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(id)', // Ensure item exists
        });

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Item updated successfully' }),
        };
      }

      case 'DELETE': {
        if (!id) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'ID is required' }),
          };
        }

        await dynamodb.delete({
          TableName: tableName,
          Key: { id },
          ConditionExpression: 'attribute_exists(id)',
        });

        return {
          statusCode: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: '',
        };
      }

      default:
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error: any) {
    console.error('Error:', error);

    // Handle specific DynamoDB errors
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Condition check failed' }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * Example: Tree operations for hierarchical data
 */
export const exampleTreeHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const dynamodb = getDynamoDBClient();

  try {
    const { pathParameters, queryStringParameters } = event;
    const tableName = process.env['DYNAMODB_TABLE'] || 'ChatTree';
    const rootId = pathParameters?.['rootId'];

    if (!rootId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Root ID is required' }),
      };
    }

    const maxDepth = queryStringParameters?.['maxDepth'] ? 
      parseInt(queryStringParameters['maxDepth']) : undefined;
    const includeMetadata = queryStringParameters?.['includeMetadata'] === 'true';

    const options: { maxDepth?: number; includeMetadata?: boolean } = {};
    if (maxDepth !== undefined) options.maxDepth = maxDepth;
    if (includeMetadata) options.includeMetadata = includeMetadata;

    const tree = await dynamodb.readTree(tableName, rootId, options);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(tree),
    };
  } catch (error: any) {
    console.error('Error reading tree:', error);

    if (error.message.includes('not found')) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Tree root not found' }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to read tree structure' }),
    };
  }
};

/**
 * Example: Batch operations for bulk data processing
 */
export const exampleBatchHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const dynamodb = getDynamoDBClient();

  try {
    const { body } = event;
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { operations } = JSON.parse(body);
    const tableName = process.env['DYNAMODB_TABLE'] || 'ChatSessions';

    // Process batch operations with automatic chunking
    const results = await dynamodb.batchOperations(
      operations.map((op: any) => ({
        ...op,
        tableName,
      }))
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Batch operations completed',
        batches: results.length,
        totalOperations: operations.length,
      }),
    };
  } catch (error: any) {
    console.error('Error in batch operations:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Batch operations failed' }),
    };
  }
};

/**
 * Example: Transaction operations for consistency
 */
export const exampleTransactionHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const dynamodb = getDynamoDBClient();

  try {
    const { body } = event;
    if (!body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { sessionId, messageData } = JSON.parse(body);
    const tableName = process.env['DYNAMODB_TABLE'] || 'ChatSessions';

    // Atomic transaction: update session and add message
    await dynamodb.transactWrite({
      TransactItems: [
        {
          Update: {
            TableName: tableName,
            Key: { id: sessionId },
            UpdateExpression: 'SET #messageCount = #messageCount + :inc, #updatedAt = :now',
            ExpressionAttributeNames: {
              '#messageCount': 'messageCount',
              '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
              ':inc': 1,
              ':now': new Date().toISOString(),
            },
            ConditionExpression: 'attribute_exists(id)',
          },
        },
        {
          Put: {
            TableName: `${tableName}_Messages`,
            Item: {
              ...messageData,
              id: `${sessionId}_${Date.now()}`,
              sessionId,
              createdAt: new Date().toISOString(),
            },
          },
        },
      ],
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Transaction completed successfully' }),
    };
  } catch (error: any) {
    console.error('Transaction error:', error);

    if (error.name === 'TransactionCanceledException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Transaction was cancelled due to conflicts' }),
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Transaction failed' }),
    };
  }
};

/**
 * Example: Health check endpoint
 */
export const exampleHealthHandler = async (): Promise<APIGatewayProxyResult> => {
  const dynamodb = getDynamoDBClient();

  try {
    const tableName = process.env['DYNAMODB_TABLE'] || 'ChatSessions';
    const isHealthy = await dynamodb.healthCheck(tableName);

    return {
      statusCode: isHealthy ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        table: tableName,
      }),
    };
  } catch (error: any) {
    console.error('Health check error:', error);

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * Example: Custom client configuration for specific use cases
 */
export const createCustomDynamoDBClient = (): EnhancedDynamoDBClient => {
  return new EnhancedDynamoDBClient({
    region: process.env['AWS_REGION'] || 'us-east-1',
    local: process.env['NODE_ENV'] === 'development',
    localEndpoint: process.env['DYNAMODB_LOCAL_ENDPOINT'] || 'http://localhost:8000',
    maxRetries: parseInt(process.env['DYNAMODB_MAX_RETRIES'] || '5'),
    maxSockets: parseInt(process.env['DYNAMODB_MAX_SOCKETS'] || '50'),
    requestTimeout: parseInt(process.env['DYNAMODB_REQUEST_TIMEOUT'] || '30000'),
    connectionTimeout: parseInt(process.env['DYNAMODB_CONNECTION_TIMEOUT'] || '5000'),
    enableLogging: process.env['DYNAMODB_ENABLE_LOGGING'] === 'true',
  });
};