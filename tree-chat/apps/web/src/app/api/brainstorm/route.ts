import { NextRequest, NextResponse } from 'next/server';

// Get LangGraph API URL from environment variable
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || (
  process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:2025' : 'http://localhost:2025'
);

interface BrainstormIdea {
  id: string;
  title: string;
  description: string;
  category: 'product' | 'service' | 'platform' | 'other';
  targetMarket: string;
  uniqueValue: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ideas?: BrainstormIdea[];
}

interface BrainstormRequest {
  message: string;
  chatHistory: ChatMessage[];
  selectedIdea?: BrainstormIdea;
  userInterests: string;
}

interface BrainstormResponse {
  success: boolean;
  response: string;
  ideas?: BrainstormIdea[];
  errors?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: BrainstormRequest = await request.json();
    
    console.log('API: Received brainstorm request:', JSON.stringify(body, null, 2));

    // Call the LangGraph brainstorm agent
    console.log('LLM: Calling brainstorm agent');
    
    const langGraphResponse = await fetch(`${LANGGRAPH_API_URL}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: 'brainstorm_agent',
        input: {
          message: body.message,
          chatHistory: body.chatHistory,
          selectedIdea: body.selectedIdea,
          userInterests: body.userInterests
        }
      })
    });

    if (!langGraphResponse.ok) {
      throw new Error(`LangGraph API call failed: ${langGraphResponse.status} ${langGraphResponse.statusText}`);
    }

    const threadResult = await langGraphResponse.json();
    console.log('LangGraph thread created:', threadResult.thread_id);

    // Now invoke the thread to get the response
    const invokeResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: 'brainstorm_agent',
        input: {
          message: body.message,
          chatHistory: body.chatHistory,
          selectedIdea: body.selectedIdea,
          userInterests: body.userInterests
        }
      })
    });

    if (!invokeResponse.ok) {
      throw new Error(`LangGraph invoke failed: ${invokeResponse.status} ${invokeResponse.statusText}`);
    }

    const runResult = await invokeResponse.json();
    console.log('LangGraph run result:', JSON.stringify(runResult, null, 2));

    // Wait for the run to complete and get the final result
    const runId = runResult.run_id;
    let finalResult = runResult;
    
    // Poll for completion (max 30 seconds)
    const maxAttempts = 60;
    let attempts = 0;
    
    while (finalResult.status === 'pending' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const statusResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (statusResponse.ok) {
        finalResult = await statusResponse.json();
        console.log(`Run status attempt ${attempts + 1}:`, finalResult.status);
      }
      
      attempts++;
    }
    
    console.log('Final LangGraph result:', JSON.stringify(finalResult, null, 2));

    // Get the final state values from the completed run
    const valuesResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/state`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    let graphOutput = {};
    
    if (valuesResponse.ok) {
      const stateData = await valuesResponse.json();
      console.log('Thread state data:', JSON.stringify(stateData, null, 2));
      
      // Extract the output from the state
      if (stateData.values && stateData.values.output) {
        graphOutput = stateData.values.output;
      } else if (stateData.values && stateData.values.response) {
        // Fallback: use response directly
        graphOutput = {
          response: stateData.values.response,
          ideas: stateData.values.ideas || [],
          success: true
        };
      }
    }

    // Extract the response from the LangGraph response
    const output = graphOutput as any;
    
    const response: BrainstormResponse = {
      success: true,
      response: output?.response || "申し訳ございませんが、回答を生成できませんでした。",
      ideas: output?.ideas
    };

    console.log('API: Sending response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Brainstorm API route error:', error);
    
    return NextResponse.json({
      success: false,
      response: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 });
  }
}