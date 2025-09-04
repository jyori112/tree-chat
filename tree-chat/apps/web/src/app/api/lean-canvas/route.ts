import { NextRequest, NextResponse } from 'next/server';
import { leanCanvasClient } from '@/lib/api-configs/lean-canvas';

interface LeanCanvasRequest {
  businessName: string;
  canvasData: Record<string, string>;
  context?: {
    timestamp?: string;
    requestType?: 'suggestion' | 'validation' | 'improvement';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LeanCanvasRequest = await request.json();
    
    console.log('API: Received lean canvas request for:', body.businessName);

    // Use the unified LangGraph client
    const result = await leanCanvasClient.execute(body);
    
    if (!result.success) {
      throw new Error(result.error || 'LangGraph execution failed');
    }

    console.log('API: Sending response with', result.data?.suggestions.length, 'suggestions');
    
    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Lean canvas API route error:', error);
    
    return NextResponse.json({
      success: false,
      suggestions: [],
      metadata: {
        reasoning: 'Error occurred during processing',
        model: 'gpt-4o',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}