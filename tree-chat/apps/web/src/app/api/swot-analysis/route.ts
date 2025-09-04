import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Get LangGraph API URL from environment variable
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || (
  process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:2025' : 'http://localhost:2025'
);

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

interface LangGraphResponse {
  success: boolean;
  suggestions: SwotSuggestion[];
  crossSwot?: {
    so: string;
    wo: string;
    st: string;
    wt: string;
  };
  reasoning?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SwotRequest = await request.json();
    
    console.log('API: Received SWOT analysis request for:', body.businessName);

    // LangGraph Agent IDを使用（実際のIDに置き換える必要がある場合があります）
    const assistantId = 'swot_analysis_agent';
    
    // LangGraph APIを呼び出し
    try {
      console.log('LLM: Calling SWOT analysis agent for business:', body.businessName);
      
      const langGraphResponse = await fetch(`${LANGGRAPH_API_URL}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          input: {
            businessName: body.businessName,
            strengths: body.canvasData.strengths || '',
            weaknesses: body.canvasData.weaknesses || '',
            opportunities: body.canvasData.opportunities || '',
            threats: body.canvasData.threats || '',
            analysisType: body.context?.requestType === 'improvement' ? 'review' : 'initial'
          }
        })
      });

      if (!langGraphResponse.ok) {
        throw new Error(`LangGraph API call failed: ${langGraphResponse.status} ${langGraphResponse.statusText}`);
      }

      const threadResult = await langGraphResponse.json();
      console.log('LangGraph thread created:', threadResult.thread_id);

      // Threadを実行
      const invokeResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistant_id: assistantId,
          input: {
            businessName: body.businessName,
            strengths: body.canvasData.strengths || '',
            weaknesses: body.canvasData.weaknesses || '',
            opportunities: body.canvasData.opportunities || '',
            threats: body.canvasData.threats || '',
            analysisType: body.context?.requestType === 'improvement' ? 'review' : 'initial'
          }
        })
      });

      if (!invokeResponse.ok) {
        throw new Error(`LangGraph invoke failed: ${invokeResponse.status} ${invokeResponse.statusText}`);
      }

      const runResult = await invokeResponse.json();
      const runId = runResult.run_id;
      
      // 実行完了を待つ（最大30秒）
      let finalResult = runResult;
      const maxAttempts = 60;
      let attempts = 0;
      
      while (finalResult.status === 'pending' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/runs/${runId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (statusResponse.ok) {
          finalResult = await statusResponse.json();
        }
        
        attempts++;
      }
      
      // 最終状態を取得
      const valuesResponse = await fetch(`${LANGGRAPH_API_URL}/threads/${threadResult.thread_id}/state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (valuesResponse.ok) {
        const stateData = await valuesResponse.json();
        const output = stateData.values?.output || {};
        
        // LangGraphの出力をAPIレスポンス形式に変換
        // suggestionsのフィールド名を変換
        const transformedSuggestions = (output.suggestions || []).map((s: any) => ({
          sectionId: s.id,
          currentValue: s.currentValue,
          suggestion: s.suggestedValue,
          reasoning: s.reasoning,
          priority: s.priority,
          type: s.type
        }));
        
        const response: LangGraphResponse = {
          success: output.success !== false,
          suggestions: transformedSuggestions,
          crossSwot: output.crossSwot,
          reasoning: output.reasoning,
          error: output.error
        };
        
        console.log('API: Sending SWOT suggestions:', response.suggestions.length);
        return NextResponse.json(response);
      }
      
    } catch (langGraphError) {
      console.error('LangGraph API error:', langGraphError);
      // フォールバック: 簡易的なサジェストを返す
    }

    // フォールバック処理（LangGraphが利用できない場合）
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

    const response: LangGraphResponse = {
      success: true,
      suggestions: suggestions,
      reasoning: `SWOT分析により${body.businessName}の戦略的ポジションを明確化しました（フォールバック）`
    };

    console.log('API: Sending SWOT suggestions (fallback):', response.suggestions.length);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('SWOT analysis API error:', error);
    
    return NextResponse.json({
      success: false,
      suggestions: [],
      reasoning: 'Error occurred during SWOT analysis',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}