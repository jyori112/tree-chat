/**
 * Value Proposition Canvas Framework Definition
 */

import { FrameworkDefinition } from '../shared/framework-types.js';

export const valuePropositionCanvasDefinition: FrameworkDefinition = {
  id: 'value-proposition-canvas',
  name: 'バリュープロポジションキャンバス',
  description: '顧客のニーズと提供価値のフィット（適合）を可視化',
  
  fields: [
    // 顧客セグメント側
    {
      id: 'customerJobs',
      name: '顧客の仕事（Jobs）',
      description: '顧客が達成しようとしている仕事、解決したい問題、満たしたいニーズ',
      examples: [
        '機能的な仕事（タスクの完了）',
        '社会的な仕事（良く見られたい）',
        '感情的な仕事（安心感を得たい）',
        '支援的な仕事（他の仕事を助ける）'
      ]
    },
    {
      id: 'customerPains',
      name: '顧客の痛み（Pains）',
      description: '顧客が仕事を行う上で感じる不満、リスク、障害',
      examples: [
        '望ましくない結果',
        '障害と課題',
        'リスクと不安',
        '高いコスト（時間・金銭・労力）'
      ]
    },
    {
      id: 'customerGains',
      name: '顧客の利得（Gains）',
      description: '顧客が求める成果、期待を超える価値、喜び',
      examples: [
        '必須の利得（最低限の期待）',
        '期待される利得（当然の期待）',
        '望まれる利得（あれば嬉しい）',
        '予期しない利得（驚きと喜び）'
      ]
    },
    // 価値提案側
    {
      id: 'productsServices',
      name: '製品・サービス',
      description: '顧客に提供する製品やサービスのリスト',
      examples: [
        '物理的製品',
        'デジタル製品',
        '無形サービス',
        '金融商品'
      ]
    },
    {
      id: 'painRelievers',
      name: 'ペインリリーバー',
      description: '顧客の痛みを和らげる方法',
      examples: [
        'コスト削減',
        'リスク軽減',
        '労力の削減',
        '不満の解消'
      ]
    },
    {
      id: 'gainCreators',
      name: 'ゲインクリエーター',
      description: '顧客に利得をもたらす方法',
      examples: [
        'パフォーマンス向上',
        '社会的地位の向上',
        '満足感の創出',
        '期待を超える価値'
      ]
    },
    // フィット評価
    {
      id: 'fitAssessment',
      name: 'フィット評価',
      description: '顧客ニーズと価値提案のマッチング度合い',
      examples: [
        'Problem-Solution Fit',
        'Product-Market Fit',
        '優先順位のアライメント',
        '差別化ポイント'
      ]
    }
  ],
  
  systemPrompt: `あなたは顧客価値創造の専門家です。
バリュープロポジションキャンバスを用いて、顧客のニーズと提供価値の適合性を分析し、改善提案を行ってください。

分析の観点：

【顧客プロファイル】
1. 顧客の仕事（Customer Jobs）：
   - 機能的な仕事（何を達成したいか）
   - 社会的な仕事（どう見られたいか）
   - 感情的な仕事（どう感じたいか）

2. 痛み（Pains）：
   - 望ましくない結果や問題
   - 障害となっているもの
   - リスクや不安
   - コスト（時間・金銭・労力）

3. 利得（Gains）：
   - 求める成果と利益
   - 期待していること
   - 喜びとなること

【価値マップ】
4. 製品・サービス：
   - 提供する製品やサービスのリスト
   - 核となる価値提案

5. ペインリリーバー：
   - 顧客の痛みをどう和らげるか
   - 問題をどう解決するか

6. ゲインクリエーター：
   - どのような利得を生み出すか
   - 期待をどう超えるか

7. フィット評価：
   - 顧客ニーズと価値提案の適合度
   - 改善すべきギャップ

提案は以下の形式で行ってください：
- 具体的で実践的な内容
- 箇条書きで3-5個の要点
- そのビジネスの文脈に即した現実的な提案
- 日本語で記述

顧客視点と価値提案を明確にマッチングさせることが重要です。`
};