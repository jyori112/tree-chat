import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

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
    const { workspaceId, path, value } = body;

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

    // Create DynamoDB item
    const timestamp = new Date().toISOString();
    const item = {
      workspaceId,
      path,
      data: value,
      updatedAt: timestamp,
      updatedBy: userId,
      createdAt: timestamp,
      createdBy: userId,
    };

    // Write to DynamoDB
    await docClient.send(new PutCommand({
      TableName: 'tree-chat-data-local',
      Item: item,
    }));

    return NextResponse.json({
      success: true,
      timestamp,
      path,
      workspaceId,
    });

  } catch (error) {
    console.error('Direct DynamoDB write failed:', error);
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