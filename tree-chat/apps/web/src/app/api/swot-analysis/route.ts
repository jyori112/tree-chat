import { NextRequest, NextResponse } from 'next/server';
import { swotAnalysisClient } from '@/lib/api-configs/swot-analysis';

interface SwotRequest {
  businessName: string;
  canvasData: Record<string, string>;
  context?: {
    timestamp?: string;
    requestType?: 'suggestion' | 'validation' | 'improvement';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SwotRequest = await request.json();
    
    console.log('API: Received SWOT analysis request for:', body.businessName);

    // Use the unified LangGraph client
    const result = await swotAnalysisClient.execute(body);
    
    if (!result.success) {
      throw new Error(result.error || 'LangGraph execution failed');
    }

    console.log('API: Sending SWOT suggestions:', result.data?.suggestions.length);
    
    return NextResponse.json(result.data);

  } catch (error) {
    console.error('SWOT analysis API error:', error);
    
    return NextResponse.json({
      success: false,
      suggestions: [],
      reasoning: 'Error occurred during SWOT analysis',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}