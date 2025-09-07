/**
 * Generic LangGraph Client for API Routes
 * Handles common thread creation, execution, polling, and state retrieval
 */

interface LangGraphConfig<TInput, TOutput> {
  assistantId: string;
  transformInput: (requestData: any) => TInput;
  transformOutput: (langGraphOutput: any) => TOutput;
  maxPollingAttempts?: number;
  pollingInterval?: number;
}

interface LangGraphExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class LangGraphClient<TInput = any, TOutput = any> {
  private readonly apiUrl: string;
  private readonly config: LangGraphConfig<TInput, TOutput>;

  constructor(config: LangGraphConfig<TInput, TOutput>) {
    this.apiUrl = process.env.LANGGRAPH_API_URL || (
      process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:2024' : 'http://localhost:2024'
    );
    this.config = {
      maxPollingAttempts: 60,
      pollingInterval: 500,
      ...config
    };
  }

  async execute(requestData: any): Promise<LangGraphExecutionResult<TOutput>> {
    try {
      // Transform input using template-specific logic
      const input = this.config.transformInput(requestData);
      
      console.log(`LangGraph: Calling agent ${this.config.assistantId}`);
      
      // Create thread
      const threadResult = await this.createThread(input);
      if (!threadResult.success || !threadResult.threadId) {
        throw new Error(threadResult.error || 'Failed to create thread');
      }

      // Execute thread
      const runResult = await this.runThread(threadResult.threadId, input);
      if (!runResult.success || !runResult.runId) {
        throw new Error(runResult.error || 'Failed to run thread');
      }

      // Poll for completion
      const _completionResult = await this.pollForCompletion(
        threadResult.threadId,
        runResult.runId
      );

      // Get final state
      const stateResult = await this.getThreadState(threadResult.threadId);
      if (!stateResult.success || !stateResult.output) {
        throw new Error(stateResult.error || 'Failed to get thread state');
      }

      // Transform output using template-specific logic
      const transformedOutput = this.config.transformOutput(stateResult.output);
      
      return {
        success: true,
        data: transformedOutput
      };

    } catch (error) {
      console.error('LangGraph execution error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createThread(input: TInput): Promise<{ success: boolean; threadId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistant_id: this.config.assistantId,
          input
        })
      });

      if (!response.ok) {
        throw new Error(`Thread creation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('LangGraph thread created:', result.thread_id);

      return {
        success: true,
        threadId: result.thread_id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Thread creation failed'
      };
    }
  }

  private async runThread(threadId: string, input: TInput): Promise<{ success: boolean; runId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistant_id: this.config.assistantId,
          input
        })
      });

      if (!response.ok) {
        throw new Error(`Thread run failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        runId: result.run_id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Thread run failed'
      };
    }
  }

  private async pollForCompletion(threadId: string, runId: string): Promise<{ success: boolean; status?: string; error?: string }> {
    let attempts = 0;
    const maxAttempts = this.config.maxPollingAttempts!;
    const interval = this.config.pollingInterval!;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.apiUrl}/threads/${threadId}/runs/${runId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.status !== 'pending') {
            return {
              success: true,
              status: result.status
            };
          }
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        console.error(`Polling attempt ${attempts} failed:`, error);
      }
    }

    return {
      success: false,
      error: 'Polling timeout'
    };
  }

  private async getThreadState(threadId: string): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/threads/${threadId}/state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get thread state: ${response.status} ${response.statusText}`);
      }

      const stateData = await response.json();
      const output = stateData.values?.output || {};

      return {
        success: true,
        output
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get thread state'
      };
    }
  }
}

// Helper function to create a configured client
export function createLangGraphClient<TInput = any, TOutput = any>(
  config: LangGraphConfig<TInput, TOutput>
): LangGraphClient<TInput, TOutput> {
  return new LangGraphClient(config);
}