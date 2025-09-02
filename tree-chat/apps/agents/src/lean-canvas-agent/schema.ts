import { z } from "zod";

// Schema for lean canvas suggestion
export const LeanCanvasSuggestionSchema = z.object({
  sectionId: z.string().describe("リーンキャンバスのセクションID (problem, solution, metrics, uvp, advantage, channels, segments, cost, revenue)"),
  currentValue: z.string().describe("現在の入力値"),
  suggestion: z.string().describe("具体的な改善提案"),
  reasoning: z.string().describe("なぜこの提案をするのかの理由"),
  priority: z.enum(["high", "medium", "low"]).describe("提案の優先度"),
  type: z.enum(["empty", "insufficient", "improvement"]).describe("提案のタイプ"),
});

// Main structured output schema
export const LeanCanvasResponseSchema = z.object({
  reasoning: z.string().describe("全体的な分析と提案の理由"),
  suggestions: z.array(LeanCanvasSuggestionSchema).describe("リーンキャンバスの改善提案リスト"),
});

export type LeanCanvasResponse = z.infer<typeof LeanCanvasResponseSchema>;
export type LeanCanvasSuggestionType = z.infer<typeof LeanCanvasSuggestionSchema>;