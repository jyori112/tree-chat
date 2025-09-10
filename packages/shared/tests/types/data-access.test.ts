/**
 * Unit tests for data access types and interfaces
 * 
 * Tests the core data access interfaces, types, and error definitions
 * defined in packages/shared/src/types/data-access.ts
 */

import {
  type DataResponse,
  type TreeResponse,
  type BatchOperation,
  type DataClient,
  type DataClientConfig,
  type DataAccessError,
  type ValidationResult,
  type AuditLog
} from '../../src/types/data-access';

describe('DataResponse interface', () => {
  it('should create successful data response', () => {
    const response: DataResponse<{ name: string }> = {
      data: { name: 'Test' },
      timestamp: new Date().toISOString()
    };

    expect(response.data).toEqual({ name: 'Test' });
    expect(response.error).toBeUndefined();
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should create null data response', () => {
    const response: DataResponse<string> = {
      data: null,
      timestamp: new Date().toISOString()
    };

    expect(response.data).toBeNull();
    expect(response.error).toBeUndefined();
  });

  it('should create error response', () => {
    const response: DataResponse<any> = {
      data: null,
      error: 'Not found',
      errorCode: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    };

    expect(response.data).toBeNull();
    expect(response.error).toBe('Not found');
    expect(response.errorCode).toBe('NOT_FOUND');
  });

  it('should support generic type parameters', () => {
    const stringResponse: DataResponse<string> = {
      data: 'hello',
      timestamp: new Date().toISOString()
    };

    const numberResponse: DataResponse<number> = {
      data: 42,
      timestamp: new Date().toISOString()
    };

    const objectResponse: DataResponse<{ id: number; name: string }> = {
      data: { id: 1, name: 'test' },
      timestamp: new Date().toISOString()
    };

    expect(stringResponse.data).toBe('hello');
    expect(numberResponse.data).toBe(42);
    expect(objectResponse.data?.id).toBe(1);
  });
});

describe('TreeResponse interface', () => {
  it('should create tree response with data', () => {
    const response: TreeResponse = {
      data: {
        '/sessions/123': { title: 'Session 1' },
        '/sessions/123/pages/1': { content: 'Page content' },
        '/sessions/456': { title: 'Session 2' }
      },
      count: 3,
      pathPrefix: '/sessions',
      timestamp: new Date().toISOString()
    };

    expect(response.data['/sessions/123']).toEqual({ title: 'Session 1' });
    expect(response.count).toBe(3);
    expect(response.pathPrefix).toBe('/sessions');
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should create empty tree response', () => {
    const response: TreeResponse = {
      data: {},
      count: 0,
      pathPrefix: '/nonexistent',
      timestamp: new Date().toISOString()
    };

    expect(response.data).toEqual({});
    expect(response.count).toBe(0);
    expect(response.pathPrefix).toBe('/nonexistent');
  });

  it('should handle hierarchical data structures', () => {
    const response: TreeResponse = {
      data: {
        '/workspace/sessions': null,
        '/workspace/sessions/session1': { title: 'First Session', createdAt: '2024-01-01' },
        '/workspace/sessions/session1/pages': null,
        '/workspace/sessions/session1/pages/page1': { framework: 'lean-canvas', data: {} }
      },
      count: 4,
      pathPrefix: '/workspace',
      timestamp: new Date().toISOString()
    };

    expect(response.count).toBe(4);
    expect(response.data['/workspace/sessions']).toBeNull();
    expect(response.data['/workspace/sessions/session1/pages/page1'].framework).toBe('lean-canvas');
  });
});

describe('BatchOperation interface', () => {
  it('should create read operation', () => {
    const operation: BatchOperation = {
      type: 'read',
      path: '/sessions/123/metadata'
    };

    expect(operation.type).toBe('read');
    expect(operation.path).toBe('/sessions/123/metadata');
    expect(operation.value).toBeUndefined();
    expect(operation.defaultValue).toBeUndefined();
  });

  it('should create read operation with default value', () => {
    const operation: BatchOperation = {
      type: 'read',
      path: '/sessions/123/config',
      defaultValue: { theme: 'light' }
    };

    expect(operation.type).toBe('read');
    expect(operation.defaultValue).toEqual({ theme: 'light' });
  });

  it('should create write operation', () => {
    const operation: BatchOperation = {
      type: 'write',
      path: '/sessions/123/metadata',
      value: { title: 'Updated Session', updatedAt: '2024-01-01' }
    };

    expect(operation.type).toBe('write');
    expect(operation.path).toBe('/sessions/123/metadata');
    expect(operation.value).toEqual({ title: 'Updated Session', updatedAt: '2024-01-01' });
  });

  it('should create write operation with null value', () => {
    const operation: BatchOperation = {
      type: 'write',
      path: '/sessions/123/deleted_field',
      value: null
    };

    expect(operation.type).toBe('write');
    expect(operation.value).toBeNull();
  });

  it('should only accept valid operation types', () => {
    // These should compile successfully
    const readOp: BatchOperation['type'] = 'read';
    const writeOp: BatchOperation['type'] = 'write';

    expect(readOp).toBe('read');
    expect(writeOp).toBe('write');

    // Invalid operation type would cause TypeScript error
    // const invalidOp: BatchOperation['type'] = 'delete'; // TS Error
  });
});

describe('DataClient interface', () => {
  // Create a mock implementation for testing
  const createMockDataClient = (): DataClient => ({
    read: jest.fn(),
    write: jest.fn(),
    readTree: jest.fn(),
    readWithDefault: jest.fn(),
    batch: jest.fn()
  });

  it('should define read method signature', () => {
    const client = createMockDataClient();
    
    // Method should exist and be callable
    expect(typeof client.read).toBe('function');
    
    // Test method signature
    client.read('workspace-123', '/sessions/456', 'user-789');
    expect(client.read).toHaveBeenCalledWith('workspace-123', '/sessions/456', 'user-789');
  });

  it('should define write method signature', () => {
    const client = createMockDataClient();
    
    expect(typeof client.write).toBe('function');
    
    client.write('workspace-123', '/sessions/456', { title: 'Test' }, 'user-789');
    expect(client.write).toHaveBeenCalledWith('workspace-123', '/sessions/456', { title: 'Test' }, 'user-789');
  });

  it('should define readTree method signature', () => {
    const client = createMockDataClient();
    
    expect(typeof client.readTree).toBe('function');
    
    client.readTree('workspace-123', '/sessions', 'user-789');
    expect(client.readTree).toHaveBeenCalledWith('workspace-123', '/sessions', 'user-789');
  });

  it('should define readWithDefault method signature', () => {
    const client = createMockDataClient();
    
    expect(typeof client.readWithDefault).toBe('function');
    
    client.readWithDefault('workspace-123', '/config/theme', 'light', 'user-789');
    expect(client.readWithDefault).toHaveBeenCalledWith('workspace-123', '/config/theme', 'light', 'user-789');
  });

  it('should define batch method signature', () => {
    const client = createMockDataClient();
    const operations: BatchOperation[] = [
      { type: 'read', path: '/sessions/123' },
      { type: 'write', path: '/sessions/123/updated', value: new Date().toISOString() }
    ];
    
    expect(typeof client.batch).toBe('function');
    
    client.batch('workspace-123', operations, 'user-789');
    expect(client.batch).toHaveBeenCalledWith('workspace-123', operations, 'user-789');
  });
});

describe('DataClientConfig interface', () => {
  it('should create default configuration', () => {
    const config: DataClientConfig = {};

    expect(config.maxRetries).toBeUndefined();
    expect(config.retryDelayMs).toBeUndefined();
    expect(config.timeoutMs).toBeUndefined();
    expect(config.enableDebugLogging).toBeUndefined();
  });

  it('should create complete configuration', () => {
    const config: DataClientConfig = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 5000,
      enableDebugLogging: true
    };

    expect(config.maxRetries).toBe(3);
    expect(config.retryDelayMs).toBe(1000);
    expect(config.timeoutMs).toBe(5000);
    expect(config.enableDebugLogging).toBe(true);
  });

  it('should support partial configuration', () => {
    const config: DataClientConfig = {
      maxRetries: 5,
      enableDebugLogging: false
    };

    expect(config.maxRetries).toBe(5);
    expect(config.enableDebugLogging).toBe(false);
    expect(config.retryDelayMs).toBeUndefined();
    expect(config.timeoutMs).toBeUndefined();
  });
});

describe('DataAccessError interface', () => {
  it('should create error with all required fields', () => {
    const error: DataAccessError = {
      name: 'DataAccessError',
      message: 'Invalid path format',
      code: 'INVALID_PATH',
      timestamp: new Date().toISOString()
    };

    expect(error.code).toBe('INVALID_PATH');
    expect(error.message).toBe('Invalid path format');
    expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should support all error codes', () => {
    const errorCodes: DataAccessError['code'][] = [
      'INVALID_PATH',
      'WORKSPACE_ACCESS_DENIED',
      'BATCH_SIZE_EXCEEDED',
      'ITEM_TOO_LARGE',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'INTERNAL_ERROR'
    ];

    errorCodes.forEach(code => {
      const error: DataAccessError = {
        name: 'DataAccessError',
        message: `Error with code ${code}`,
        code,
        timestamp: new Date().toISOString()
      };

      expect(error.code).toBe(code);
    });
  });

  it('should include optional details', () => {
    const error: DataAccessError = {
      name: 'DataAccessError',
      message: 'Network timeout occurred',
      code: 'TIMEOUT_ERROR',
      timestamp: new Date().toISOString(),
      details: {
        timeout: 5000,
        endpoint: 'https://api.example.com'
      },
      path: '/sessions/123',
      workspaceId: 'workspace-456'
    };

    expect(error.details.timeout).toBe(5000);
    expect(error.path).toBe('/sessions/123');
    expect(error.workspaceId).toBe('workspace-456');
  });
});

describe('ValidationResult interface', () => {
  it('should create successful validation result', () => {
    const result: ValidationResult = {
      isValid: true
    };

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.field).toBeUndefined();
  });

  it('should create failed validation result', () => {
    const result: ValidationResult = {
      isValid: false,
      error: 'Path contains invalid characters',
      field: 'path'
    };

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Path contains invalid characters');
    expect(result.field).toBe('path');
  });

  it('should create failed validation without field specification', () => {
    const result: ValidationResult = {
      isValid: false,
      error: 'General validation error'
    };

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('General validation error');
    expect(result.field).toBeUndefined();
  });
});

describe('AuditLog interface', () => {
  it('should create complete audit log', () => {
    const auditLog: AuditLog = {
      operationId: 'op-123456',
      operation: 'write',
      userId: 'user-789',
      workspaceId: 'workspace-123',
      paths: ['/sessions/456/metadata'],
      timestamp: new Date().toISOString(),
      success: true,
      durationMs: 150
    };

    expect(auditLog.operationId).toBe('op-123456');
    expect(auditLog.operation).toBe('write');
    expect(auditLog.userId).toBe('user-789');
    expect(auditLog.workspaceId).toBe('workspace-123');
    expect(auditLog.paths).toEqual(['/sessions/456/metadata']);
    expect(auditLog.success).toBe(true);
    expect(auditLog.durationMs).toBe(150);
    expect(auditLog.error).toBeUndefined();
  });

  it('should create audit log for failed operation', () => {
    const auditLog: AuditLog = {
      operationId: 'op-789012',
      operation: 'read',
      userId: 'user-456',
      workspaceId: 'workspace-789',
      paths: ['/sessions/nonexistent'],
      timestamp: new Date().toISOString(),
      success: false,
      error: 'Path not found',
      durationMs: 50
    };

    expect(auditLog.success).toBe(false);
    expect(auditLog.error).toBe('Path not found');
    expect(auditLog.operation).toBe('read');
  });

  it('should support all operation types', () => {
    const operations: AuditLog['operation'][] = ['read', 'write', 'readTree', 'batch'];

    operations.forEach(operation => {
      const auditLog: AuditLog = {
        operationId: `op-${operation}`,
        operation,
        userId: 'user-123',
        workspaceId: 'workspace-456',
        paths: ['/test/path'],
        timestamp: new Date().toISOString(),
        success: true,
        durationMs: 100
      };

      expect(auditLog.operation).toBe(operation);
    });
  });

  it('should handle batch operations with multiple paths', () => {
    const auditLog: AuditLog = {
      operationId: 'op-batch-001',
      operation: 'batch',
      userId: 'user-123',
      workspaceId: 'workspace-456',
      paths: ['/sessions/1/metadata', '/sessions/1/data', '/sessions/2/metadata'],
      timestamp: new Date().toISOString(),
      success: true,
      durationMs: 250
    };

    expect(auditLog.operation).toBe('batch');
    expect(auditLog.paths).toHaveLength(3);
    expect(auditLog.paths).toContain('/sessions/1/metadata');
    expect(auditLog.paths).toContain('/sessions/2/metadata');
  });
});