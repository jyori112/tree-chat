import { Annotation } from '@langchain/langgraph';

export interface SwotSection {
  id: string;
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  type: 'empty' | 'insufficient' | 'improvement';
}

const SwotState = Annotation.Root({
  businessName: Annotation<string>,
  
  // SWOT各要素の現在値
  strengths: Annotation<string>,
  weaknesses: Annotation<string>,
  opportunities: Annotation<string>,
  threats: Annotation<string>,
  
  // 分析結果
  suggestions: Annotation<SwotSection[]>,
  
  // クロスSWOT戦略
  soStrategy: Annotation<string>, // Strengths × Opportunities
  woStrategy: Annotation<string>, // Weaknesses × Opportunities
  stStrategy: Annotation<string>, // Strengths × Threats
  wtStrategy: Annotation<string>, // Weaknesses × Threats
  
  // メタデータ
  analysisType: Annotation<'initial' | 'review' | 'strategy'>,
  reasoning: Annotation<string>,
  
  // エラー処理
  error: Annotation<string | null>,
  
  // 最終出力
  output: Annotation<any>
});

export default SwotState;