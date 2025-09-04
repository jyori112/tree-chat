import { NextRequest, NextResponse } from 'next/server';

// 簡易的なSWOT分析API（実際のLangGraph統合なし）
interface SwotRequest {
  businessName: string;
  canvasData: Record<string, string>;
  context?: {
    timestamp?: string;
    requestType?: 'suggestion' | 'validation' | 'improvement';
  };
}

interface SwotSuggestion {
  sectionId: string;
  currentValue: string;
  suggestion: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  type: 'empty' | 'insufficient' | 'improvement';
}

export async function POST(request: NextRequest) {
  try {
    const body: SwotRequest = await request.json();
    
    console.log('API: Received SWOT analysis request for:', body.businessName);

    // 各セクションに対するサジェストを生成
    const suggestions: SwotSuggestion[] = [];

    // 強み(Strengths)のサジェスト
    if (!body.canvasData.strengths || body.canvasData.strengths.length < 20) {
      suggestions.push({
        sectionId: 'strengths',
        currentValue: body.canvasData.strengths || '',
        suggestion: `• 技術的な専門性や特許
• 優れたチームメンバーやリーダーシップ
• 独自のビジネスプロセス
• ブランド認知度や顧客ロイヤルティ
• 財務的な安定性`,
        reasoning: `${body.businessName}の内部環境における強みを明確化することで、競争優位性を活かした戦略立案が可能になります。`,
        priority: 'high',
        type: body.canvasData.strengths ? 'insufficient' : 'empty'
      });
    }

    // 弱み(Weaknesses)のサジェスト
    if (!body.canvasData.weaknesses || body.canvasData.weaknesses.length < 20) {
      suggestions.push({
        sectionId: 'weaknesses',
        currentValue: body.canvasData.weaknesses || '',
        suggestion: `• リソース（人材、資金、技術）の不足
• プロセスの非効率性
• 市場認知度の低さ
• 地理的な制約
• 経験やノウハウの不足`,
        reasoning: `弱みを認識し改善することで、${body.businessName}の持続的な成長基盤を構築できます。`,
        priority: 'high',
        type: body.canvasData.weaknesses ? 'insufficient' : 'empty'
      });
    }

    // 機会(Opportunities)のサジェスト
    if (!body.canvasData.opportunities || body.canvasData.opportunities.length < 20) {
      suggestions.push({
        sectionId: 'opportunities',
        currentValue: body.canvasData.opportunities || '',
        suggestion: `• 市場の成長トレンド
• 新技術の登場（AI、IoT等）
• 規制緩和や政策支援
• 競合の撤退や市場の空白
• 消費者行動の変化`,
        reasoning: `外部環境の機会を捉えることで、${body.businessName}の成長を加速させることができます。`,
        priority: 'medium',
        type: body.canvasData.opportunities ? 'insufficient' : 'empty'
      });
    }

    // 脅威(Threats)のサジェスト
    if (!body.canvasData.threats || body.canvasData.threats.length < 20) {
      suggestions.push({
        sectionId: 'threats',
        currentValue: body.canvasData.threats || '',
        suggestion: `• 新規参入者の増加
• 代替品・サービスの登場
• 原材料コストの上昇
• 規制強化やコンプライアンス要求
• 経済情勢の悪化`,
        reasoning: `脅威を事前に把握しリスク対策を講じることで、${body.businessName}の事業継続性を確保できます。`,
        priority: 'medium',
        type: body.canvasData.threats ? 'insufficient' : 'empty'
      });
    }

    // クロスSWOT分析のヒント（全フィールドに一定の内容がある場合）
    const hasContent = Object.values(body.canvasData).every(v => v && v.length > 50);
    if (hasContent) {
      // 改善提案を追加
      if (body.canvasData.strengths && body.canvasData.opportunities) {
        suggestions.push({
          sectionId: 'strengths',
          currentValue: body.canvasData.strengths,
          suggestion: body.canvasData.strengths + '\n\n【S×O戦略】強みを活かして機会を最大化:\n• ' + 
            body.businessName + 'の強みを使って市場機会を捉える積極戦略を検討しましょう',
          reasoning: 'クロスSWOT分析により、より具体的な戦略立案が可能です。',
          priority: 'low',
          type: 'improvement'
        });
      }
    }

    const response = {
      success: true,
      suggestions: suggestions,
      metadata: {
        reasoning: `SWOT分析により${body.businessName}の戦略的ポジションを明確化しました`,
        model: 'rule-based', // 簡易版のため
        analysisType: 'SWOT'
      }
    };

    console.log('API: Sending SWOT suggestions:', response.suggestions.length);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('SWOT analysis API error:', error);
    
    return NextResponse.json({
      success: false,
      suggestions: [],
      metadata: {
        reasoning: 'Error occurred during SWOT analysis',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}