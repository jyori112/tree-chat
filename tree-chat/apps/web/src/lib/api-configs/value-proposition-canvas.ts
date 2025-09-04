/**
 * Value Proposition Canvas API Configuration
 */

import { createFrameworkApi } from '../create-framework-api';

// フレームワーク定義
const valuePropositionCanvasFramework = {
  id: 'value-proposition-canvas',
  name: 'バリュープロポジションキャンバス',
  fields: [
    { id: 'customerJobs', name: '顧客の仕事' },
    { id: 'customerPains', name: '顧客の痛み' },
    { id: 'customerGains', name: '顧客の利得' },
    { id: 'productsServices', name: '製品・サービス' },
    { id: 'painRelievers', name: 'ペインリリーバー' },
    { id: 'gainCreators', name: 'ゲインクリエーター' },
    { id: 'fitAssessment', name: 'フィット評価' }
  ]
};

// API Clientを自動生成
export const valuePropositionCanvasClient = createFrameworkApi(valuePropositionCanvasFramework);