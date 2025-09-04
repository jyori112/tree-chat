/**
 * Business Model Canvas API Configuration
 */

import { createFrameworkApi } from '../create-framework-api';

// フレームワーク定義
const businessModelCanvasFramework = {
  id: 'business-model-canvas',
  name: 'ビジネスモデルキャンバス',
  fields: [
    { id: 'keyPartners', name: '主要パートナー' },
    { id: 'keyActivities', name: '主要活動' },
    { id: 'keyResources', name: '主要リソース' },
    { id: 'valuePropositions', name: '価値提案' },
    { id: 'customerRelationships', name: '顧客との関係' },
    { id: 'channels', name: 'チャネル' },
    { id: 'customerSegments', name: '顧客セグメント' },
    { id: 'costStructure', name: 'コスト構造' },
    { id: 'revenueStreams', name: '収益の流れ' }
  ]
};

// API Clientを自動生成
export const businessModelCanvasClient = createFrameworkApi(businessModelCanvasFramework);