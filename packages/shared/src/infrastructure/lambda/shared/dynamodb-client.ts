import {
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  TransactGetCommand,
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
} from '@aws-sdk/lib-dynamodb';
import { ConfiguredRetryStrategy } from '@smithy/util-retry';

/**
 * Configuration options for DynamoDB client
 */
export interface DynamoDBClientOptions {
  /** AWS region (defaults to environment variable or us-east-1) */
  region?: string;
  /** Whether to use local DynamoDB (defaults to false) */
  local?: boolean;
  /** Local DynamoDB endpoint (defaults to http://localhost:8000) */
  localEndpoint?: string;
  /** Maximum number of retry attempts (defaults to 3) */
  maxRetries?: number;
  /** Maximum connection pool size (defaults to 50) */
  maxSockets?: number;
  /** Request timeout in milliseconds (defaults to 30000) */
  requestTimeout?: number;
  /** Connection timeout in milliseconds (defaults to 5000) */
  connectionTimeout?: number;
  /** Enable detailed logging (defaults to false) */
  enableLogging?: boolean;
}

/**
 * Retry configuration with exponential backoff
 */
const createRetryStrategy = (maxRetries: number = 3) => {
  return new ConfiguredRetryStrategy(
    maxRetries,
    (attempt: number) => {
      // Exponential backoff: 100ms * 2^attempt with jitter
      const baseDelay = 100;
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * exponentialDelay;
      return Math.min(exponentialDelay + jitter, 20000); // Cap at 20 seconds
    }
  );
};

/**
 * Enhanced DynamoDB client with production-ready features
 */
export class EnhancedDynamoDBClient {
  private client: DynamoDBClient;
  private documentClient: DynamoDBDocumentClient;
  private options: Required<DynamoDBClientOptions>;
  private logger: (message: string, data?: any) => void;

  constructor(options: DynamoDBClientOptions = {}) {
    this.options = {
      region: options.region || process.env['AWS_REGION'] || 'us-east-1',
      local: options.local || process.env['NODE_ENV'] === 'development' || false,
      localEndpoint: options.localEndpoint || 'http://localhost:8000',
      maxRetries: options.maxRetries || 3,
      maxSockets: options.maxSockets || 50,
      requestTimeout: options.requestTimeout || 30000,
      connectionTimeout: options.connectionTimeout || 5000,
      enableLogging: options.enableLogging || false,
    };

    this.logger = this.options.enableLogging 
      ? (message: string, data?: any) => console.log(`[DynamoDB]: ${message}`, data || '')
      : () => {};

    this.client = this.createClient();
    this.documentClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    this.logger('DynamoDB client initialized', {
      region: this.options.region,
      local: this.options.local,
      endpoint: this.options.local ? this.options.localEndpoint : 'AWS',
    });
  }

  /**
   * Create the underlying DynamoDB client with optimized configuration
   */
  private createClient(): DynamoDBClient {
    const config: DynamoDBClientConfig = {
      region: this.options.region,
      retryStrategy: createRetryStrategy(this.options.maxRetries),
      requestHandler: {
        requestTimeout: this.options.requestTimeout,
        connectionTimeout: this.options.connectionTimeout,
        maxSockets: this.options.maxSockets,
      },
    };

    // Configure for local DynamoDB if specified
    if (this.options.local) {
      config.endpoint = this.options.localEndpoint;
      config.credentials = {
        accessKeyId: 'local',
        secretAccessKey: 'local',
      };
    }

    return new DynamoDBClient(config);
  }

  /**
   * Handle DynamoDB errors with proper logging and retry logic
   */
  private async handleError<T>(
    operation: string,
    error: any
  ): Promise<never> {
    this.logger(`Error in ${operation}`, {
      name: error.name,
      message: error.message,
      statusCode: error.$metadata?.httpStatusCode,
    });

    // Handle throttling errors
    if (error.name === 'ProvisionedThroughputExceededException' || 
        error.name === 'ThrottlingException') {
      this.logger(`Throttling detected in ${operation}, will be retried by SDK`);
    }

    // Handle validation errors
    if (error.name === 'ValidationException') {
      this.logger(`Validation error in ${operation}`, error.message);
    }

    // Handle resource not found
    if (error.name === 'ResourceNotFoundException') {
      this.logger(`Resource not found in ${operation}`, error.message);
    }

    throw error;
  }

  /**
   * Execute a command with error handling and logging
   */
  private async executeCommand<T>(
    operation: string,
    command: any
  ): Promise<T> {
    try {
      const startTime = Date.now();
      this.logger(`Executing ${operation}`);
      
      const result = await this.documentClient.send(command);
      
      const duration = Date.now() - startTime;
      this.logger(`${operation} completed`, { 
        duration: `${duration}ms`,
        consumedCapacity: (result as any).ConsumedCapacity,
      });
      
      return result as T;
    } catch (error) {
      return await this.handleError(operation, error);
    }
  }

  /**
   * Get a single item from DynamoDB
   */
  async get(params: GetCommandInput): Promise<GetCommandOutput> {
    return this.executeCommand('GetItem', new GetCommand(params));
  }

  /**
   * Put an item into DynamoDB
   */
  async put(params: PutCommandInput): Promise<PutCommandOutput> {
    return this.executeCommand('PutItem', new PutCommand(params));
  }

  /**
   * Update an item in DynamoDB
   */
  async update(params: UpdateCommandInput): Promise<UpdateCommandOutput> {
    return this.executeCommand('UpdateItem', new UpdateCommand(params));
  }

  /**
   * Delete an item from DynamoDB
   */
  async delete(params: DeleteCommandInput): Promise<DeleteCommandOutput> {
    return this.executeCommand('DeleteItem', new DeleteCommand(params));
  }

  /**
   * Query items from DynamoDB
   */
  async query(params: QueryCommandInput): Promise<QueryCommandOutput> {
    return this.executeCommand('Query', new QueryCommand(params));
  }

  /**
   * Scan items from DynamoDB
   */
  async scan(params: ScanCommandInput): Promise<ScanCommandOutput> {
    return this.executeCommand('Scan', new ScanCommand(params));
  }

  /**
   * Batch get items from DynamoDB
   */
  async batchGet(params: BatchGetCommandInput): Promise<BatchGetCommandOutput> {
    return this.executeCommand('BatchGetItem', new BatchGetCommand(params));
  }

  /**
   * Batch write items to DynamoDB
   */
  async batchWrite(params: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
    return this.executeCommand('BatchWriteItem', new BatchWriteCommand(params));
  }

  /**
   * Execute a transaction write operation
   */
  async transactWrite(params: TransactWriteCommandInput): Promise<TransactWriteCommandOutput> {
    return this.executeCommand('TransactWriteItems', new TransactWriteCommand(params));
  }

  /**
   * Execute a transaction get operation
   */
  async transactGet(params: TransactGetCommandInput): Promise<TransactGetCommandOutput> {
    return this.executeCommand('TransactGetItems', new TransactGetCommand(params));
  }

  /**
   * Read a tree structure from DynamoDB with optimized queries
   */
  async readTree(tableName: string, rootId: string, options?: {
    maxDepth?: number;
    includeMetadata?: boolean;
  }) {
    const { maxDepth = 10, includeMetadata = false } = options || {};
    
    try {
      this.logger('Reading tree structure', { rootId, maxDepth });
      
      // Get root node
      const rootResponse = await this.get({
        TableName: tableName,
        Key: { id: rootId },
      });

      if (!rootResponse.Item) {
        throw new Error(`Root node ${rootId} not found`);
      }

      // Query all descendants using GSI or scan with filter
      const queryResponse = await this.query({
        TableName: tableName,
        IndexName: 'parent-index', // Assumes GSI on parent field
        KeyConditionExpression: 'parent = :rootId',
        ExpressionAttributeValues: {
          ':rootId': rootId,
        },
      });

      // Build tree structure
      const nodes = [rootResponse.Item, ...(queryResponse.Items || [])];
      const tree = this.buildTreeStructure(nodes, rootId, maxDepth);

      this.logger('Tree read completed', { 
        nodeCount: nodes.length,
        depth: this.calculateTreeDepth(tree),
      });

      return includeMetadata ? {
        tree,
        metadata: {
          nodeCount: nodes.length,
          depth: this.calculateTreeDepth(tree),
          rootId,
        }
      } : tree;
    } catch (error) {
      await this.handleError('ReadTree', error);
    }
  }

  /**
   * Build tree structure from flat array of nodes
   */
  private buildTreeStructure(nodes: any[], rootId: string, maxDepth: number): any {
    const nodeMap = new Map();
    const children = new Map();

    // Create node map and children map
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      if (node.parent && node.parent !== rootId) {
        if (!children.has(node.parent)) {
          children.set(node.parent, []);
        }
        children.get(node.parent).push(node.id);
      }
    });

    // Build tree recursively
    const buildNode = (nodeId: string, depth: number): any => {
      if (depth > maxDepth) return null;
      
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const nodeChildren = children.get(nodeId) || [];
      return {
        ...node,
        children: nodeChildren
          .map((childId: string) => buildNode(childId, depth + 1))
          .filter(Boolean),
      };
    };

    return buildNode(rootId, 0);
  }

  /**
   * Calculate the depth of a tree structure
   */
  private calculateTreeDepth(tree: any): number {
    if (!tree || !tree.children || tree.children.length === 0) {
      return 1;
    }
    
    return 1 + Math.max(...tree.children.map((child: any) => this.calculateTreeDepth(child)));
  }

  /**
   * Batch operations with automatic chunking and retry
   */
  async batchOperations(operations: Array<{
    type: 'put' | 'delete';
    tableName: string;
    item?: any;
    key?: any;
  }>) {
    const BATCH_SIZE = 25; // DynamoDB limit
    const chunks = [];
    
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      chunks.push(operations.slice(i, i + BATCH_SIZE));
    }

    const results = [];
    for (const chunk of chunks) {
      const requestItems: any = {};
      
      chunk.forEach(op => {
        if (!requestItems[op.tableName]) {
          requestItems[op.tableName] = [];
        }
        
        if (op.type === 'put') {
          requestItems[op.tableName].push({
            PutRequest: { Item: op.item }
          });
        } else if (op.type === 'delete') {
          requestItems[op.tableName].push({
            DeleteRequest: { Key: op.key }
          });
        }
      });

      const result = await this.batchWrite({ RequestItems: requestItems });
      results.push(result);
    }

    return results;
  }

  /**
   * Health check for DynamoDB connection
   */
  async healthCheck(tableName: string): Promise<boolean> {
    try {
      await this.scan({
        TableName: tableName,
        Limit: 1,
      });
      this.logger('Health check passed');
      return true;
    } catch (error) {
      this.logger('Health check failed', error);
      return false;
    }
  }

  /**
   * Get the underlying DynamoDB client
   */
  getClient(): DynamoDBClient {
    return this.client;
  }

  /**
   * Get the document client
   */
  getDocumentClient(): DynamoDBDocumentClient {
    return this.documentClient;
  }

  /**
   * Destroy the client and clean up connections
   */
  destroy(): void {
    this.client.destroy();
    this.logger('DynamoDB client destroyed');
  }
}

/**
 * Default singleton instance for Lambda functions
 */
let defaultClient: EnhancedDynamoDBClient | null = null;

/**
 * Get or create the default DynamoDB client instance
 */
export function getDynamoDBClient(options?: DynamoDBClientOptions): EnhancedDynamoDBClient {
  if (!defaultClient) {
    defaultClient = new EnhancedDynamoDBClient({
      enableLogging: process.env['NODE_ENV'] !== 'production',
      ...options,
    });
  }
  return defaultClient;
}

/**
 * Reset the default client (useful for testing)
 */
export function resetDynamoDBClient(): void {
  if (defaultClient) {
    defaultClient.destroy();
    defaultClient = null;
  }
}

// Export types for external use
export type {
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
};