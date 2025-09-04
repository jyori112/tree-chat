import { NextResponse } from 'next/server';
import { businessModelCanvasClient } from '@/lib/api-configs/business-model-canvas';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const result = await businessModelCanvasClient.execute(requestData);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to process request',
          suggestions: []
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Business Model Canvas API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      },
      { status: 500 }
    );
  }
}