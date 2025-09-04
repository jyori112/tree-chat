/**
 * Lean Canvas API Configuration
 */

import { createFrameworkApi } from '../create-framework-api';

// フレームワーク定義
const leanCanvasFramework = {
  id: 'lean-canvas',
  name: 'リーンキャンバス',
  fields: [
    { id: 'problem', name: '課題' },
    { id: 'solution', name: '解決策' },
    { id: 'metrics', name: '主要指標' },
    { id: 'uvp', name: '価値提案' },
    { id: 'advantage', name: '優位性' },
    { id: 'channels', name: 'チャネル' },
    { id: 'segments', name: '顧客層' },
    { id: 'cost', name: 'コスト構造' },
    { id: 'revenue', name: '収益' }
  ]
};

// API Clientを自動生成
export const leanCanvasClient = createFrameworkApi(leanCanvasFramework);