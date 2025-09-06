'use client';

const API_URL = process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || 'http://localhost:2024';

interface TaskSuggestionRequest {
  sessionId: string;
  currentPageId: string;
  tasks: any[];
  pages: any[];
  requestType?: 'general' | 'next_tasks' | 'results_to_record' | 'status_updates';
}

interface TaskSuggestion {
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
}

interface TaskSuggestionResponse {
  suggestions: TaskSuggestion[];
  summary: string;
}

export class TaskSuggestionClient {
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_URL;
  }

  async getSuggestions(request: TaskSuggestionRequest): Promise<TaskSuggestionResponse> {
    try {
      // Create a thread
      const threadResponse = await fetch(`${this.apiUrl}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      if (!threadResponse.ok) {
        throw new Error('Failed to create thread');
      }
      
      const thread = await threadResponse.json();
      
      // Run the task suggestion agent
      const runResponse = await fetch(`${this.apiUrl}/threads/${thread.thread_id}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_id: 'task_suggestion_agent',
          input: request,
          config: {
            configurable: {
              model: 'anthropic/claude-3-5-sonnet-20241022',
              temperature: 0.7,
              maxSuggestions: 5,
            }
          }
        }),
      });
      
      if (!runResponse.ok) {
        throw new Error('Failed to start run');
      }
      
      const run = await runResponse.json();
      
      // Poll for completion
      let finalState: any = null;
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds with 500ms intervals
      
      while (attempts < maxAttempts) {
        const statusResponse = await fetch(
          `${this.apiUrl}/threads/${thread.thread_id}/runs/${run.run_id}`,
          { method: 'GET' }
        );
        
        if (!statusResponse.ok) {
          throw new Error('Failed to get run status');
        }
        
        const status = await statusResponse.json();
        
        if (status.status === 'completed') {
          // Get the final state
          const stateResponse = await fetch(
            `${this.apiUrl}/threads/${thread.thread_id}/state`,
            { method: 'GET' }
          );
          
          if (!stateResponse.ok) {
            throw new Error('Failed to get final state');
          }
          
          finalState = await stateResponse.json();
          break;
        } else if (status.status === 'failed' || status.status === 'cancelled') {
          throw new Error(`Run ${status.status}`);
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!finalState) {
        throw new Error('Timeout waiting for response');
      }

      // Clean up thread
      await fetch(`${this.apiUrl}/threads/${thread.thread_id}`, {
        method: 'DELETE',
      });

      return {
        suggestions: finalState.values?.suggestions || [],
        summary: finalState.values?.summary || 'No suggestions available',
      };
    } catch (error) {
      console.error('Failed to get task suggestions:', error);
      // Return empty suggestions on error
      return {
        suggestions: [],
        summary: 'エラーが発生しました。後でもう一度お試しください。',
      };
    }
  }
}