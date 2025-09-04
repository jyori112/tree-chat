import { NextRequest, NextResponse } from 'next/server';

// Get LangGraph API URL from environment variable
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || (
  process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:2025' : 'http://localhost:2025'
);

interface Keyword {
  text: string;
  category: 'interest' | 'problem' | 'skill' | 'market';
  size: 'small' | 'medium' | 'large';
}

interface IdeaCard {
  title: string;
  description: string;
  keywords: string[];
}

interface Question {
  id: string;
  text: string;
  category: 'interest' | 'problem' | 'skill' | 'market';
}

interface VisualBrainstormRequest {
  question: string;
  answer: string;
  category: string;
  existingKeywords: any[];
  existingIdeas: any[];
}

interface VisualBrainstormResponse {
  success: boolean;
  keywords?: Keyword[];
  ideas?: IdeaCard[];
  newQuestions?: Question[];
  errors?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: VisualBrainstormRequest = await request.json();
    
    console.log('API: Received visual brainstorm request:', JSON.stringify(body, null, 2));

    // Call the LangGraph visual brainstorm agent
    console.log('LLM: Calling visual brainstorm agent');
    
    const langGraphResponse = await fetch(`${LANGGRAPH_API_URL}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: 'visual_brainstorm_agent',
        input: {
          question: body.question,
          answer: body.answer,
          category: body.category,
          existingKeywords: body.existingKeywords,
          existingIdeas: body.existingIdeas
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
        assistant_id: 'visual_brainstorm_agent',
        input: {
          question: body.question,
          answer: body.answer,
          category: body.category,
          existingKeywords: body.existingKeywords,
          existingIdeas: body.existingIdeas
        }
      })
    });

    if (!invokeResponse.ok) {
      throw new Error(`LangGraph invoke failed: ${invokeResponse.status} ${invokeResponse.statusText}`);
    }

    const runResult = await invokeResponse.json();
    console.log('LangGraph run result:', JSON.stringify(runResult, null, 2));

    // Wait for the run to complete
    const runId = runResult.run_id;
    let finalResult = runResult;
    
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
      }
      
      attempts++;
    }

    // Get the final state values
    const valuesResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/state`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    let graphOutput = {};
    
    if (valuesResponse.ok) {
      const stateData = await valuesResponse.json();
      
      if (stateData.values && stateData.values.output) {
        graphOutput = stateData.values.output;
      } else if (stateData.values) {
        graphOutput = {
          keywords: stateData.values.keywords || [],
          ideas: stateData.values.ideas || [],
          newQuestions: stateData.values.newQuestions || [],
          success: true
        };
      }
    }

    const output = graphOutput as any;
    
    const response: VisualBrainstormResponse = {
      success: true,
      keywords: output?.keywords,
      ideas: output?.ideas,
      newQuestions: output?.newQuestions
    };

    console.log('API: Sending response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Visual brainstorm API route error:', error);
    
    return NextResponse.json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }, { status: 500 });
  }
}