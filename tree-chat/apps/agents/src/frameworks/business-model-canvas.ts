/**
 * Business Model Canvas Framework Definition
 */

import { FrameworkDefinition } from '../shared/framework-types.js';

export const businessModelCanvasDefinition: FrameworkDefinition = {
  id: 'business-model-canvas',
  name: 'ビジネスモデルキャンバス',
  description: 'ビジネスモデル全体を9つの要素で可視化',
  
  fields: [
    {
      id: 'keyPartners',
      name: '主要パートナー',
      description: 'ビジネスモデルを機能させるために必要な主要サプライヤーとパートナーのネットワーク',
      examples: ['サプライヤー', '戦略的提携', '合弁事業', 'アウトソーシング先']
    },
    {
      id: 'keyActivities',
      name: '主要活動',
      description: '価値提案を実現するために企業が行わなければならない最も重要な活動',
      examples: ['製造', '問題解決', 'プラットフォーム運営', 'ネットワーク構築']
    },
    {
      id: 'keyResources',
      name: '主要リソース',
      description: 'ビジネスモデルを機能させるために必要な最も重要な資産',
      examples: ['人的資源', '物的資源', '知的財産', '金融資源']
    },
    {
      id: 'valuePropositions',
      name: '価値提案',
      description: '特定の顧客セグメントに向けて価値を創造する製品とサービスの組み合わせ',
      examples: ['新規性', 'パフォーマンス', 'カスタマイゼーション', 'デザイン', '価格', 'リスク軽減']
    },
    {
      id: 'customerRelationships',
      name: '顧客との関係',
      description: '特定の顧客セグメントとどのような関係を構築し維持するか',
      examples: ['パーソナルアシスタンス', 'セルフサービス', '自動化サービス', 'コミュニティ', '共創']
    },
    {
      id: 'channels',
      name: 'チャネル',
      description: '顧客セグメントとどのようにコミュニケーションし、価値提案を届けるか',
      examples: ['営業部隊', 'ウェブ販売', '自社店舗', 'パートナー店舗', 'ホールセール']
    },
    {
      id: 'customerSegments',
      name: '顧客セグメント',
      description: '企業が価値を提供したい異なるグループの人々や組織',
      examples: ['マス市場', 'ニッチ市場', 'セグメント化', 'マルチサイド市場']
    },
    {
      id: 'costStructure',
      name: 'コスト構造',
      description: 'ビジネスモデルを運営するために発生するすべてのコスト',
      examples: ['固定費', '変動費', '規模の経済', '範囲の経済']
    },
    {
      id: 'revenueStreams',
      name: '収益の流れ',
      description: '企業が各顧客セグメントから生み出す収益',
      examples: ['資産販売', '使用料', 'サブスクリプション', 'レンタル/リース', 'ライセンス', '仲介手数料', '広告']
    }
  ],
  
  systemPrompt: `あなたは経験豊富なビジネスストラテジストです。
ビジネスモデルキャンバスの各要素を分析し、以下の観点で改善提案を行ってください：

9つの構成要素：
1. 主要パートナー（Key Partners）: ビジネスを支える外部パートナー
2. 主要活動（Key Activities）: 価値を生み出すために必要な活動
3. 主要リソース（Key Resources）: ビジネスに必要な経営資源
4. 価値提案（Value Propositions）: 顧客に提供する価値
5. 顧客との関係（Customer Relationships）: 顧客との関係性の構築方法
6. チャネル（Channels）: 顧客への価値の届け方
7. 顧客セグメント（Customer Segments）: ターゲット顧客層
8. コスト構造（Cost Structure）: ビジネスの主要コスト
9. 収益の流れ（Revenue Streams）: 収益化の方法

提案は以下の形式で行ってください：
- 具体的で実践的な内容
- 箇条書きで3-5個の要点
- そのビジネスの文脈に即した現実的な提案
- 日本語で記述
- 各要素間の整合性を考慮

特に重要なのは、9つの要素が相互に関連し合い、全体として一貫性のあるビジネスモデルを構築することです。`
};