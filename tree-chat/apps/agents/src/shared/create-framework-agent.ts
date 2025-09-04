/**
 * Framework-based Agent Creator
 * フレームワーク定義から自動的にエージェントを生成
 */

import { Annotation } from "@langchain/langgraph";
import { createCanvasAgent } from './canvas-agent-base.js';
import { formatBusinessData } from './canvas-data-formatter.js';
import { 
  FrameworkDefinition, 
  createResponseSchema
} from './framework-types.js';

/**
 * フレームワーク定義からStateを生成
 */
export function createFrameworkState(definition: FrameworkDefinition) {
  const stateFields: Record<string, any> = {
    // 基本フィールド
    businessName: Annotation<string>,
    
    // フレームワークのフィールド
    ...definition.fields.reduce((acc, field) => {
      acc[field.id] = Annotation<string>;
      return acc;
    }, {} as Record<string, any>),
    
    // 出力フィールド（クロスSWOT戦略など）
    ...(definition.outputFields || []).reduce((acc, fieldId) => {
      acc[fieldId] = Annotation<string>;
      return acc;
    }, {} as Record<string, any>),
    
    // 共通フィールド
    suggestions: Annotation<any[]>,
    reasoning: Annotation<string>,
    error: Annotation<string | null>,
    output: Annotation<any>
  };
  
  return Annotation.Root(stateFields);
}

/**
 * フレームワーク定義からエージェントを生成
 */
export function createFrameworkAgent(definition: FrameworkDefinition) {
  const State = createFrameworkState(definition);
  const ResponseSchema = createResponseSchema(definition);
  
  return createCanvasAgent(State, {
    agentName: `${definition.name} Agent`,
    model: 'gpt-4o',
    temperature: 0.7,
    structuredOutputSchema: ResponseSchema,
    
    formatInput: (state) => {
      // フィールドデータを収集
      const fieldData = definition.fields.reduce((acc, field) => {
        acc[field.id] = state[field.id] || '';
        return acc;
      }, {} as Record<string, string>);
      
      // ビジネスデータをフォーマット
      const businessInfo = formatBusinessData(
        state.businessName,
        fieldData,
        definition.id as any
      );
      
      return `${definition.systemPrompt}

${businessInfo}

このフレームワークを分析し、空欄や不十分な項目について、そのまま記入できる具体的な日本語の文章を提案してください。`;
    },
    
    parseOutput: (response, state) => {
      // 出力フィールドの処理（例：クロスSWOT戦略）
      const outputFields: Record<string, string> = {};
      
      if (definition.outputFields) {
        definition.outputFields.forEach(fieldId => {
          const suggestion = response.suggestions?.find(
            (s: any) => s.sectionId === fieldId
          );
          if (suggestion) {
            outputFields[fieldId] = suggestion.suggestion || '';
          }
        });
      }
      
      return {
        ...state,
        ...outputFields,
        suggestions: response.suggestions || [],
        reasoning: response.reasoning || '',
        output: {
          success: true,
          suggestions: response.suggestions || [],
          metadata: {
            reasoning: response.reasoning,
            model: 'gpt-4o',
            processingTime: Date.now()
          }
        }
      };
    }
  });
}

/**
 * API設定生成用のエクスポート
 * Next.jsのAPI設定ファイルで使用
 */
export function getFrameworkApiConfig(definition: FrameworkDefinition) {
  return {
    assistantId: `${definition.id.replace('-', '_')}_agent`,
    
    // 入力変換
    getInputTransform: () => {
      const fields = definition.fields.reduce((acc, field) => {
        acc[field.id] = `requestData.canvasData?.${field.id} || ''`;
        return acc;
      }, {} as Record<string, string>);
      
      return {
        businessName: 'requestData.businessName',
        ...fields
      };
    },
    
    // 出力変換
    getOutputTransform: () => ({
      success: 'true',
      suggestions: 'langGraphOutput?.suggestions || []',
      metadata: {
        reasoning: 'langGraphOutput?.reasoning',
        model: "'gpt-4o'"
      }
    })
  };
}