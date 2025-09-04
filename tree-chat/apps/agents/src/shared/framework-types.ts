/**
 * Framework Definition Types
 * 思考フレームワークの共通定義
 */

import { z } from 'zod';

// フィールド定義
export interface FrameworkField {
  id: string;
  name: string;
  description: string;  // AI向けの説明
  examples?: string[];  // 記入例
}

// フレームワーク定義
export interface FrameworkDefinition {
  id: string;
  name: string;
  description: string;
  fields: FrameworkField[];
  systemPrompt: string;
  
  // Zodスキーマ生成用
  suggestionFields?: string[]; // suggestion可能なフィールドID
  outputFields?: string[]; // 出力に含める追加フィールド
}

// 共通サジェスションスキーマ生成
export function createSuggestionSchema(definition: FrameworkDefinition) {
  const sectionIds = definition.suggestionFields || definition.fields.map(f => f.id);
  
  return z.object({
    sectionId: z.enum(sectionIds as [string, ...string[]]).describe("セクションID"),
    currentValue: z.string().describe("現在の入力値"),
    suggestion: z.string().describe("具体的な改善提案（箇条書き）"),
    reasoning: z.string().describe("なぜこの提案をするのかの理由"),
    priority: z.enum(["high", "medium", "low"]).describe("提案の優先度"),
    type: z.enum(["empty", "insufficient", "improvement"]).describe("提案のタイプ"),
  });
}

// 共通レスポンススキーマ生成
export function createResponseSchema(definition: FrameworkDefinition) {
  const SuggestionSchema = createSuggestionSchema(definition);
  
  return z.object({
    suggestions: z.array(SuggestionSchema)
      .describe("各セクションへの改善提案リスト"),
    reasoning: z.string()
      .describe("全体的な分析理由と戦略的な考察"),
  });
}

// State生成ヘルパー
export function createStateFields(definition: FrameworkDefinition) {
  const fields: Record<string, any> = {};
  
  // 各フィールドをstateに追加
  definition.fields.forEach(field => {
    fields[field.id] = `Annotation<string>`;
  });
  
  // 出力フィールドを追加
  if (definition.outputFields) {
    definition.outputFields.forEach(fieldId => {
      fields[fieldId] = `Annotation<string>`;
    });
  }
  
  return fields;
}