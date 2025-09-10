import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client for local testing
const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: NextRequest) {
  try {
    // Authenticate with Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { workspaceId, path } = body;

    // Validate inputs
    if (!workspaceId || !path) {
      return NextResponse.json(
        { error: 'workspaceId and path are required' },
        { status: 400 }
      );
    }

    if (!path.startsWith('/')) {
      return NextResponse.json(
        { error: 'Path must start with /' },
        { status: 400 }
      );
    }

    // Read from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: 'tree-chat-data-local',
      Key: {
        workspaceId,
        path,
      },
      ConsistentRead: true,
    }));

    const data = result.Item ? (result.Item.data || result.Item) : null;

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      path,
      workspaceId,
    });

  } catch (error) {
    console.error('Direct DynamoDB read failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}