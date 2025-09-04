/**
 * Lean Canvas Framework Definition
 */

import { FrameworkDefinition } from '../shared/framework-types.js';

export const leanCanvasDefinition: FrameworkDefinition = {
  id: 'lean-canvas',
  name: 'リーンキャンバス',
  description: 'ビジネスモデルを1枚にまとめる',
  
  fields: [
    {
      id: 'problem',
      name: '課題',
      description: '顧客が抱える本質的な問題や痛み。解決すべき上位3つの課題を具体的に記述する',
      examples: ['時間がかかる', 'コストが高い', '複雑すぎる']
    },
    {
      id: 'solution',
      name: '解決策',
      description: '課題に対する具体的な解決方法。どのように問題を解決するかを明確に示す',
      examples: ['自動化ツール', 'シンプルなUI', 'AIアシスタント']
    },
    {
      id: 'metrics',
      name: '主要指標',
      description: '成功を測定するための定量的な指標。KPIとして追跡可能な数値',
      examples: ['月間アクティブユーザー数', 'コンバージョン率', 'チャーン率']
    },
    {
      id: 'uvp',
      name: '価値提案',
      description: '競合と差別化される独自の価値。顧客が選ぶ理由となる明確なメリット',
      examples: ['10倍速い', '半額のコスト', '24時間サポート']
    },
    {
      id: 'advantage',
      name: '優位性',
      description: '簡単にコピーできない競争上の優位性。持続可能な差別化要素',
      examples: ['特許技術', '独占契約', 'ネットワーク効果']
    },
    {
      id: 'channels',
      name: 'チャネル',
      description: '顧客にリーチし、価値を届けるための経路。販売・マーケティングチャネル',
      examples: ['オンライン広告', 'パートナー販売', '直接営業']
    },
    {
      id: 'segments',
      name: '顧客層',
      description: 'ターゲットとなる顧客セグメント。アーリーアダプターと主要顧客層',
      examples: ['スタートアップ企業', '20-30代の個人', 'エンタープライズ']
    },
    {
      id: 'cost',
      name: 'コスト構造',
      description: '事業運営に必要な主要なコスト。固定費と変動費の内訳',
      examples: ['開発費', 'マーケティング費', 'サーバー費用']
    },
    {
      id: 'revenue',
      name: '収益',
      description: '収益モデルと価格戦略。どのように収益を生み出すか',
      examples: ['月額サブスクリプション', 'トランザクション手数料', 'ライセンス販売']
    }
  ],
  
  systemPrompt: `あなたは経験豊富なビジネスコンサルタントです。
リーンキャンバスの各要素を分析し、以下の観点で改善提案を行ってください：

1. 空欄の項目：その項目を埋めるための具体的な提案
2. 不十分な項目：より具体的で実行可能な内容への改善案
3. 全体の整合性：各要素間の一貫性と相互補完性

提案は以下の形式で行ってください：
- 具体的で実践的な内容
- 箇条書きで3-5個の要点
- そのビジネスの文脈に即した現実的な提案
- 日本語で記述

特に重要なのは、単なる一般論ではなく、入力されたビジネス内容に基づいた具体的な提案を行うことです。`
};