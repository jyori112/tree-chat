import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createDataClient } from '@tree-chat/data-client'

/**
 * API Route: Read Data
 * 
 * Reads a single value from the specified hierarchical path within a workspace.
 * Requires user authentication and workspace access.
 * 
 * POST /api/data/read
 * 
 * Request Body:
 * {
 *   "workspaceId": "string",  // Required: Workspace identifier
 *   "path": "string",         // Required: Hierarchical path to data
 * }
 * 
 * Response:
 * {
 *   "data": any | null,       // The stored value or null if not found
 *   "timestamp": "string"     // ISO timestamp of the operation
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
    const { workspaceId, path } = body
    
    // Validate required parameters
    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid workspaceId parameter' }, 
        { status: 400 }
      )
    }
    
    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Invalid path parameter' }, 
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
    
    // Validate path format (must start with /)
    if (!path.startsWith('/')) {
      return NextResponse.json(
        { error: 'Path must start with /' }, 
        { status: 400 }
      )
    }
    
    // Initialize data client
    const dataClient = createDataClient({
      lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT || 'http://localhost:2024',
      timeoutMs: 10000,
      auth: {
        apiKey: process.env.DATA_API_KEY
      },
      retry: {
        maxRetries: 3,
        baseDelayMs: 1000
      }
    })
    
    // Perform read operation
    const data = await dataClient.read(workspaceId, path, userId)
    
    return NextResponse.json({
      data,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Data read operation failed:', error)
    
    // Handle specific data client errors
    if (error instanceof Error) {
      if (error.message.includes('WORKSPACE_ACCESS_DENIED')) {
        return NextResponse.json(
          { error: 'Access denied to workspace data' }, 
          { status: 403 }
        )
      }
      
      if (error.message.includes('INVALID_PATH')) {
        return NextResponse.json(
          { error: 'Invalid data path format' }, 
          { status: 400 }
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