import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createDataClient } from '@tree-chat/data-client'

/**
 * API Route: Read Tree Data
 * 
 * Reads all data items under a specified path prefix within a workspace.
 * Returns a flat key-value structure for efficient tree traversal.
 * Requires user authentication and workspace access.
 * 
 * POST /api/data/readTree
 * 
 * Request Body:
 * {
 *   "workspaceId": "string",  // Required: Workspace identifier
 *   "pathPrefix": "string"    // Required: Path prefix to query (e.g., "/sessions/456")
 * }
 * 
 * Response:
 * {
 *   "data": {                 // Key-value pairs where keys are full paths
 *     "/sessions/456/metadata": { "title": "My Session" },
 *     "/sessions/456/pages/page1/content": { "text": "Hello" }
 *   },
 *   "count": number,          // Total number of items retrieved
 *   "pathPrefix": "string",   // The path prefix that was queried
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
    const { workspaceId, pathPrefix } = body
    
    // Validate required parameters
    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid workspaceId parameter' }, 
        { status: 400 }
      )
    }
    
    if (!pathPrefix || typeof pathPrefix !== 'string') {
      return NextResponse.json(
        { error: 'Invalid pathPrefix parameter' }, 
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
    if (!pathPrefix.startsWith('/')) {
      return NextResponse.json(
        { error: 'Path prefix must start with /' }, 
        { status: 400 }
      )
    }
    
    // Initialize data client
    const dataClient = createDataClient({
      lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT || 'http://localhost:2024',
      timeoutMs: 15000, // Longer timeout for tree operations
      auth: {
        apiKey: process.env.DATA_API_KEY
      },
      retry: {
        maxRetries: 3,
        baseDelayMs: 1000
      }
    })
    
    // Perform readTree operation
    const treeData = await dataClient.readTree(workspaceId, pathPrefix, userId)
    
    // Calculate count of items
    const count = Object.keys(treeData).length
    
    return NextResponse.json({
      data: treeData,
      count,
      pathPrefix,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Data readTree operation failed:', error)
    
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
          { error: 'Invalid path prefix format' }, 
          { status: 400 }
        )
      }
      
      if (error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { error: 'Operation timed out' }, 
          { status: 504 }
        )
      }
      
      if (error.message.includes('TOO_MANY_ITEMS')) {
        return NextResponse.json(
          { error: 'Too many items to return. Use a more specific path prefix.' }, 
          { status: 413 }
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