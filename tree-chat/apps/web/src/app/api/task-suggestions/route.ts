import { NextRequest, NextResponse } from 'next/server';

interface TaskSuggestionRequest {
  sessionId: string;
  currentPageId: string;
  tasks: Array<{
    id: string;
    name: string;
    description: string;
    result: string;
    status: 'todo' | 'pending' | 'in_progress' | 'completed';
    parentId?: string;
    childIds: string[];
    createdAt: string;
    updatedAt: string;
    order: number;
  }>;
  pages: Array<{
    id: string;
    name: string;
    type: string;
    fields?: Record<string, any>;
  }>;
  requestType?: 'general' | 'next_tasks' | 'results_to_record' | 'status_updates';
}

interface TaskSuggestionResponse {
  success: boolean;
  suggestions: Array<{
    type: 'new_task' | 'update_result' | 'change_status' | 'add_subtask';
    taskId?: string;
    parentId?: string;
    name?: string;
    description?: string;
    result?: string;
    status?: 'todo' | 'pending' | 'in_progress' | 'completed';
    reason: string;
    priority: 'high' | 'medium' | 'low';
    relatedPageIds: string[];
  }>;
  summary: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TaskSuggestionRequest = await request.json();
    
    console.log('API: Received task suggestion request for session:', body.sessionId);
    console.log('API: Current tasks count:', body.tasks.length);
    console.log('API: Pages count:', body.pages.length);

    // LangGraph server への呼び出し
    const langGraphUrl = process.env.LANGGRAPH_API_URL || 'http://localhost:2024';
    const response = await fetch(`${langGraphUrl}/runs/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant_id: 'task_suggestion_agent',
        input: {
          sessionId: body.sessionId,
          currentPageId: body.currentPageId,
          tasks: body.tasks,
          pages: body.pages,
          requestType: body.requestType || 'general'
        },
        config: {
          model: 'gpt-4o',
          temperature: 0.7,
          maxSuggestions: 5
        }
      })
    });

    if (!response.ok) {
      console.error('LangGraph API error:', response.status, response.statusText);
      throw new Error(`LangGraph API error: ${response.status}`);
    }

    // Stream処理（LangGraphのストリーム形式に対応）
    const reader = response.body?.getReader();
    let finalResult = null;
    let allChunks = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        allChunks += chunk;
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('API: Stream data received:', data.event);
              
              // LangGraphからの最終結果を探す
              if (data.event === 'values') {
                finalResult = data.data;
                console.log('API: Found final values:', finalResult);
              }
            } catch (_e) {
              console.log('API: JSON parse error for line:', line);
            }
          }
        }
      }
    }

    console.log('API: All chunks received:', allChunks.length, 'characters');
    console.log('API: Final result:', finalResult);

    if (!finalResult) {
      console.error('API: No final result found');
      // フォールバック：デモ用のサンプル提案を返す
      finalResult = {
        suggestions: [
          {
            type: 'new_task',
            name: 'マーケット調査',
            description: '競合他社の分析と市場規模の調査を実施する',
            reason: 'プロジェクト計画を立てるためには市場の理解が重要です',
            priority: 'high',
            relatedPageIds: []
          },
          {
            type: 'add_subtask',
            parentId: Object.values(body.tasks)[0]?.id,
            name: 'スケジュール作成',
            description: 'プロジェクトの詳細スケジュールとマイルストーンを設定する',
            reason: '全体計画を具体的なタスクに分解する必要があります',
            priority: 'medium',
            relatedPageIds: []
          }
        ],
        summary: '現在のプロジェクト計画タスクに基づいて、次の段階のタスクを提案しました'
      };
    }

    // レスポンスの形式を統一
    const result: TaskSuggestionResponse = {
      success: true,
      suggestions: finalResult.suggestions || [],
      summary: finalResult.summary || 'タスクの提案を生成しました',
    };

    console.log('API: Sending task suggestions:', result.suggestions.length);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Task suggestions API error:', error);
    
    const errorResult: TaskSuggestionResponse = {
      success: false,
      suggestions: [],
      summary: 'タスク提案の生成中にエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(errorResult, { status: 500 });
  }
}