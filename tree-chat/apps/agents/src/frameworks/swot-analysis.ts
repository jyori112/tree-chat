/**
 * SWOT Analysis Framework Definition
 */

import { FrameworkDefinition } from '../shared/framework-types.js';

export const swotAnalysisDefinition: FrameworkDefinition = {
  id: 'swot-analysis',
  name: 'SWOT分析',
  description: '戦略的な強み・弱み・機会・脅威の分析',
  
  fields: [
    {
      id: 'strengths',
      name: '強み',
      description: '内部環境における強み。組織が持つ競争優位性や得意分野',
      examples: ['技術力', 'ブランド力', '顧客基盤']
    },
    {
      id: 'weaknesses',
      name: '弱み',
      description: '内部環境における弱み。改善すべき点や競合に劣る部分',
      examples: ['資金不足', '人材不足', '知名度の低さ']
    },
    {
      id: 'opportunities',
      name: '機会',
      description: '外部環境における機会。追い風となる市場動向や環境変化',
      examples: ['市場の成長', '規制緩和', '新技術の登場']
    },
    {
      id: 'threats',
      name: '脅威',
      description: '外部環境における脅威。リスクとなる市場動向や競合の動き',
      examples: ['競合の参入', '規制強化', '市場の縮小']
    }
  ],
  
  // クロスSWOT戦略も通常の項目として扱う
  suggestionFields: [
    'strengths', 'weaknesses', 'opportunities', 'threats',
    'soStrategy', 'woStrategy', 'stStrategy', 'wtStrategy'
  ],
  
  // クロスSWOT戦略フィールドを出力に含める
  outputFields: ['soStrategy', 'woStrategy', 'stStrategy', 'wtStrategy'],
  
  systemPrompt: `あなたは経験豊富な戦略コンサルタントです。
SWOT分析の各要素を評価し、以下の観点で改善提案を行ってください：

基本要素の分析：
1. 強み（Strengths）: 競争優位性となる内部要因
2. 弱み（Weaknesses）: 改善が必要な内部要因
3. 機会（Opportunities）: 活用可能な外部環境の好機
4. 脅威（Threats）: 対策が必要な外部環境のリスク

クロスSWOT戦略の提案：
1. SO戦略（強み×機会）: 強みを活かして機会を最大限に活用する積極戦略
2. WO戦略（弱み×機会）: 弱みを改善して機会を逃さないための改善戦略
3. ST戦略（強み×脅威）: 強みを活かして脅威を回避・軽減する差別化戦略
4. WT戦略（弱み×脅威）: 弱みを最小化し脅威を回避する防衛戦略

提案は以下の形式で行ってください：
- 具体的で実行可能な内容
- 箇条書きで3-5個の要点
- そのビジネスの文脈に即した現実的な提案
- 日本語で記述

特に重要なのは、4つの基本要素の相互関係を考慮し、統合的な戦略を提案することです。`
};