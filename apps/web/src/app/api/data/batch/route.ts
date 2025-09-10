import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createDataClient } from '@tree-chat/data-client'
import type { BatchOperation } from '@tree-chat/data-client'

/**
 * API Route: Batch Operations
 * 
 * Executes multiple data operations atomically within a single transaction.
 * All operations must succeed or the entire batch is rolled back.
 * Maximum 25 operations per batch (DynamoDB transaction limit).
 * Requires user authentication and workspace access.
 * 
 * POST /api/data/batch
 * 
 * Request Body:
 * {
 *   "workspaceId": "string",      // Required: Workspace identifier
 *   "operations": [               // Required: Array of operations (max 25)
 *     {
 *       "type": "read",           // Operation type: "read" or "write"
 *       "path": "string",         // Required: Hierarchical path
 *       "defaultValue": any       // Optional: Default value for read operations
 *     },
 *     {
 *       "type": "write",          // Operation type: "read" or "write"
 *       "path": "string",         // Required: Hierarchical path
 *       "value": any              // Required for write: Value to store
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "results": any[],            // Array of results for each operation (null for writes)
 *   "operationCount": number,    // Number of operations executed
 *   "timestamp": "string"        // ISO timestamp of the operation
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Workspace context required' }, 
        { status: 403 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    const { workspaceId, operations } = body
    
    // Validate required parameters
    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid workspaceId parameter' }, 
        { status: 400 }
      )
    }
    
    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Invalid operations parameter. Must be an array.' }, 
        { status: 400 }
      )
    }
    
    // Check batch size limits (DynamoDB limit is 25 items per transaction)
    if (operations.length === 0) {
      return NextResponse.json(
        { error: 'Operations array cannot be empty' }, 
        { status: 400 }
      )
    }
    
    if (operations.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 operations allowed per batch' }, 
        { status: 400 }
      )
    }
    
    // Verify user has access to the requested workspace
    if (workspaceId !== orgId) {
      return NextResponse.json(
        { error: 'Access denied to workspace' }, 
        { status: 403 }
      )
    }
    
    // Validate each operation
    const validatedOperations: BatchOperation[] = []
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      
      // Validate operation structure
      if (!op || typeof op !== 'object') {
        return NextResponse.json(
          { error: `Invalid operation at index ${i}. Must be an object.` }, 
          { status: 400 }
        )
      }
      
      // Validate operation type
      if (!op.type || !['read', 'write'].includes(op.type)) {
        return NextResponse.json(
          { error: `Invalid operation type at index ${i}. Must be 'read' or 'write'.` }, 
          { status: 400 }
        )
      }
      
      // Validate path
      if (!op.path || typeof op.path !== 'string') {
        return NextResponse.json(
          { error: `Invalid path at operation index ${i}` }, 
          { status: 400 }
        )
      }
      
      if (!op.path.startsWith('/')) {
        return NextResponse.json(
          { error: `Path at operation index ${i} must start with '/'` }, 
          { status: 400 }
        )
      }
      
      // Validate write operations have value
      if (op.type === 'write' && op.value === undefined) {
        return NextResponse.json(
          { error: `Write operation at index ${i} must include 'value' parameter` }, 
          { status: 400 }
        )
      }
      
      // Check individual payload sizes for write operations
      if (op.type === 'write') {
        const payloadSize = JSON.stringify(op.value).length
        if (payloadSize > 350000) { // Leave some buffer for metadata
          return NextResponse.json(
            { error: `Value at operation index ${i} is too large. Maximum size is ~350KB.` }, 
            { status: 413 }
          )
        }
      }
      
      // Build validated operation
      const validatedOp: BatchOperation = {
        type: op.type,
        path: op.path
      }
      
      if (op.type === 'write') {
        validatedOp.value = op.value
      }
      
      if (op.type === 'read' && op.defaultValue !== undefined) {
        validatedOp.defaultValue = op.defaultValue
      }
      
      validatedOperations.push(validatedOp)
    }
    
    // Initialize data client
    const dataClient = createDataClient({
      lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT || 'http://localhost:2024',
      timeoutMs: 20000, // Longer timeout for batch operations
      auth: {
        apiKey: process.env.DATA_API_KEY
      },
      retry: {
        maxRetries: 3,
        baseDelayMs: 1000
      }
    })
    
    // Perform batch operation
    const results = await dataClient.batch(workspaceId, validatedOperations, userId)
    
    return NextResponse.json({
      results,
      operationCount: validatedOperations.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Data batch operation failed:', error)
    
    // Handle specific data client errors
    if (error instanceof Error) {
      if (error.message.includes('WORKSPACE_ACCESS_DENIED')) {
        return NextResponse.json(
          { error: 'Access denied to workspace data' }, 
          { status: 403 }
        )
      }
      
      if (error.message.includes('BATCH_SIZE_EXCEEDED')) {
        return NextResponse.json(
          { error: 'Batch size exceeded. Maximum 25 operations per batch.' }, 
          { status: 400 }
        )
      }
      
      if (error.message.includes('INVALID_PATH')) {
        return NextResponse.json(
          { error: 'Invalid path format in one or more operations' }, 
          { status: 400 }
        )
      }
      
      if (error.message.includes('ITEM_TOO_LARGE')) {
        return NextResponse.json(
          { error: 'One or more values too large for storage' }, 
          { status: 413 }
        )
      }
      
      if (error.message.includes('TRANSACTION_FAILED')) {
        return NextResponse.json(
          { error: 'Transaction failed. All operations have been rolled back.' }, 
          { status: 409 }
        )
      }
      
      if (error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { error: 'Operation timed out' }, 
          { status: 504 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' }, 
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' }, 
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' }, 
    { status: 405 }
  )
}