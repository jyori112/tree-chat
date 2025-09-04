/**
 * Canvas Agent Base
 * 共通のビジネスキャンバス分析エージェントのベース実装
 */

import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

// 共通のサジェスション型
export interface CanvasSuggestion {
  sectionId: string;
  currentValue: string;
  suggestion: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  type: 'empty' | 'insufficient' | 'improvement';
}

// エージェント設定
export interface CanvasAgentConfig {
  agentName: string;
  model?: string;
  temperature?: number;
  formatInput: (state: any) => string;
  parseOutput?: (llmResponse: any, state: any) => any;
  structuredOutputSchema: any;
}

/**
 * 汎用的なキャンバスエージェントを作成
 */
export function createCanvasAgent<TState extends Record<string, any>>(
  StateAnnotation: any,
  config: CanvasAgentConfig
) {
  // LLMの初期化（構造化出力付き）
  const llm = new ChatOpenAI({
    model: config.model || 'gpt-4o',
    temperature: config.temperature ?? 0.7,
  }).withStructuredOutput(config.structuredOutputSchema);

  // メイン処理ノード
  async function processCanvas(state: TState) {
    console.log(`=== ${config.agentName}: Processing ===`);
    
    try {
      // 入力データをフォーマット
      const formattedInput = config.formatInput(state);
      
      console.log(`${config.agentName}: Sending prompt to LLM`);

      // LLMを呼び出し（構造化出力）
      const response = await llm.invoke([
        { role: 'system', content: formattedInput }
      ]);

      console.log(`${config.agentName}: Received response from LLM`);

      // カスタムパース処理がある場合
      if (config.parseOutput) {
        return config.parseOutput(response, state);
      }

      // デフォルトの出力形式
      return {
        ...state,
        suggestions: response.suggestions || [],
        output: {
          success: true,
          suggestions: response.suggestions || [],
          ...response
        }
      };

    } catch (error) {
      console.error(`${config.agentName} Error:`, error);
      return {
        ...state,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: {
          success: false,
          suggestions: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // グラフの構築
  const workflow = new StateGraph(StateAnnotation)
    .addNode('process', processCanvas)
    .addEdge('__start__', 'process')
    .addEdge('process', '__end__');

  return workflow.compile();
}

