/**
 * 3C Analysis Framework Definition
 */

import { FrameworkDefinition } from '../shared/framework-types.js';

export const threeCAnalysisDefinition: FrameworkDefinition = {
  id: '3c-analysis',
  name: '3C分析',
  description: '顧客・競合・自社の3つの視点から戦略を分析',
  
  fields: [
    {
      id: 'customer',
      name: '顧客（Customer）',
      description: '顧客のニーズ、市場規模、購買行動、顧客セグメントの特徴',
      examples: [
        '市場規模と成長性',
        '顧客ニーズの変化',
        '購買決定要因',
        '顧客セグメントの特徴'
      ]
    },
    {
      id: 'competitor',
      name: '競合（Competitor）',
      description: '競合他社の戦略、強み・弱み、市場シェア、差別化要因',
      examples: [
        '主要競合の特定',
        '競合の戦略と強み',
        '市場シェアと地位',
        '競合の弱点と機会'
      ]
    },
    {
      id: 'company',
      name: '自社（Company）',
      description: '自社の強み・弱み、経営資源、ケイパビリティ、戦略的ポジション',
      examples: [
        '自社の強みと独自性',
        '保有リソース',
        'コアコンピタンス',
        '改善すべき弱み'
      ]
    },
    {
      id: 'strategy',
      name: '戦略的示唆',
      description: '3C分析から導かれる戦略的な方向性と具体的アクション',
      examples: [
        'ターゲット顧客の明確化',
        '差別化ポイントの設定',
        '競合優位性の構築',
        'リソース配分の最適化'
      ]
    }
  ],
  
  systemPrompt: `あなたは経験豊富な経営戦略コンサルタントです。
3C分析（Customer・Competitor・Company）を用いてビジネス戦略を分析し、改善提案を行ってください。

分析の観点：

1. 顧客（Customer）分析：
   - 市場規模と成長性
   - 顧客ニーズと期待値
   - 購買行動と意思決定プロセス
   - セグメント別の特徴

2. 競合（Competitor）分析：
   - 主要競合の特定と分類
   - 競合の戦略と強み
   - 市場でのポジショニング
   - 競合の弱点と隙間

3. 自社（Company）分析：
   - 自社の強みと独自性
   - 保有リソースとケイパビリティ
   - 現在の市場ポジション
   - 改善すべき課題

4. 戦略的示唆：
   - 3つの要素を統合した戦略方向性
   - 具体的なアクションプラン
   - 優先順位と実行ステップ

提案は以下の形式で行ってください：
- 具体的で実践的な内容
- 箇条書きで3-5個の要点
- そのビジネスの文脈に即した現実的な提案
- 日本語で記述

3つの視点を総合的に分析し、実行可能な戦略を導き出すことが重要です。`
};