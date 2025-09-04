import { NextResponse } from 'next/server';
import { threeCAnalysisClient } from '@/lib/api-configs/3c-analysis';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const result = await threeCAnalysisClient.execute(requestData);
    
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
    console.error('3C Analysis API Error:', error);
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