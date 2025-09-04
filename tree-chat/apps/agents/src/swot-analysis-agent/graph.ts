import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import SwotState, { SwotSection } from './state';
import { SWOT_ANALYSIS_PROMPT, SWOT_IMPROVEMENT_PROMPT } from './prompts';

const model = new ChatOpenAI({
  model: 'gpt-4o',
  temperature: 0.7,
});

/**
 * SWOT分析を実行するノード
 */
async function analyzeSwot(state: typeof SwotState.State) {
  console.log('=== SWOT Analysis Agent: Analyzing ===');
  
  try {
    const { businessName, strengths, weaknesses, opportunities, threats, analysisType } = state;
    
    // プロンプトの選択
    const systemPrompt = analysisType === 'review' 
      ? SWOT_IMPROVEMENT_PROMPT 
      : SWOT_ANALYSIS_PROMPT;
    
    // 現在の状態を整理
    const currentState = `
事業名: ${businessName}

現在のSWOT分析:
【強み (Strengths)】
${strengths || '未入力'}

【弱み (Weaknesses)】
${weaknesses || '未入力'}

【機会 (Opportunities)】
${opportunities || '未入力'}

【脅威 (Threats)】
${threats || '未入力'}
`;

    const userPrompt = `
${currentState}

上記の事業について、SWOT分析を行い、各要素に対して具体的な提案を行ってください。
特に未入力や内容が不十分な項目について、重点的に提案してください。

出力は以下のJSON形式でお願いします：
{
  "suggestions": [
    {
      "id": "strengths | weaknesses | opportunities | threats",
      "currentValue": "現在の値",
      "suggestedValue": "提案する内容（箇条書き）",
      "reasoning": "提案理由",
      "priority": "high | medium | low",
      "type": "empty | insufficient | improvement"
    }
  ],
  "crossSwot": {
    "so": "SO戦略（強み×機会）の提案",
    "wo": "WO戦略（弱み×機会）の提案", 
    "st": "ST戦略（強み×脅威）の提案",
    "wt": "WT戦略（弱み×脅威）の提案"
  },
  "reasoning": "全体的な分析理由"
}
`;

    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // レスポンスをパース
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      return {
        suggestions: result.suggestions || [],
        soStrategy: result.crossSwot?.so || '',
        woStrategy: result.crossSwot?.wo || '',
        stStrategy: result.crossSwot?.st || '',
        wtStrategy: result.crossSwot?.wt || '',
        reasoning: result.reasoning || 'SWOT分析を実行しました',
        error: null
      };
    }
    
    // パースに失敗した場合、デフォルトのサジェストを返す
    return generateDefaultSuggestions(state);
    
  } catch (error) {
    console.error('SWOT分析エラー:', error);
    return {
      error: error instanceof Error ? error.message : 'SWOT分析中にエラーが発生しました',
      suggestions: generateDefaultSuggestions(state).suggestions
    };
  }
}

/**
 * デフォルトのサジェストを生成
 */
function generateDefaultSuggestions(state: typeof SwotState.State): Partial<typeof SwotState.State> {
  const suggestions: SwotSection[] = [];
  const { businessName, strengths, weaknesses, opportunities, threats } = state;
  
  // 各要素のサジェストを生成
  if (!strengths || strengths.length < 30) {
    suggestions.push({
      id: 'strengths',
      currentValue: strengths || '',
      suggestedValue: `• 専門的な技術力やノウハウ\n• 優秀なチームメンバー\n• 独自のビジネスプロセス\n• 既存顧客との信頼関係`,
      reasoning: `${businessName}の競争優位性を明確にすることで、戦略立案の基盤となります`,
      priority: 'high',
      type: strengths ? 'insufficient' : 'empty'
    });
  }
  
  if (!weaknesses || weaknesses.length < 30) {
    suggestions.push({
      id: 'weaknesses', 
      currentValue: weaknesses || '',
      suggestedValue: `• リソース（人材・資金）の制約\n• ブランド認知度の低さ\n• スケーラビリティの課題\n• 技術的負債`,
      reasoning: `改善点を認識することで、リスク管理と成長戦略の立案が可能になります`,
      priority: 'high',
      type: weaknesses ? 'insufficient' : 'empty'
    });
  }
  
  if (!opportunities || opportunities.length < 30) {
    suggestions.push({
      id: 'opportunities',
      currentValue: opportunities || '',
      suggestedValue: `• 市場の成長トレンド\n• デジタル化の進展\n• 新しい顧客セグメント\n• パートナーシップの機会`,
      reasoning: `外部環境の機会を捉えることで、成長を加速させることができます`,
      priority: 'medium',
      type: opportunities ? 'insufficient' : 'empty'
    });
  }
  
  if (!threats || threats.length < 30) {
    suggestions.push({
      id: 'threats',
      currentValue: threats || '',
      suggestedValue: `• 競合他社の参入\n• 技術の陳腐化リスク\n• 規制強化の可能性\n• 経済環境の変化`,
      reasoning: `脅威を事前に把握し、対策を講じることで事業の持続性を確保できます`,
      priority: 'medium',
      type: threats ? 'insufficient' : 'empty'
    });
  }
  
  return {
    suggestions,
    reasoning: 'SWOT分析の基本的な観点から提案を生成しました',
    error: null
  };
}

/**
 * 結果をフォーマットするノード
 */
async function formatOutput(state: typeof SwotState.State) {
  console.log('=== SWOT Analysis Agent: Formatting Output ===');
  
  return {
    output: {
      businessName: state.businessName,
      suggestions: state.suggestions,
      crossSwot: {
        so: state.soStrategy,
        wo: state.woStrategy,
        st: state.stStrategy,
        wt: state.wtStrategy
      },
      reasoning: state.reasoning,
      success: !state.error,
      error: state.error
    }
  };
}

// グラフの構築
const workflow = new StateGraph(SwotState)
  .addNode('analyze_swot', analyzeSwot)
  .addNode('format_output', formatOutput)
  .addEdge('__start__', 'analyze_swot')
  .addEdge('analyze_swot', 'format_output')
  .addEdge('format_output', '__end__');

export const graph = workflow.compile();