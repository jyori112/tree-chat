/**
 * SWOT Analysis API Configuration
 */

import { createFrameworkApi } from '../create-framework-api';

// フレームワーク定義
const swotAnalysisFramework = {
  id: 'swot-analysis',
  name: 'SWOT分析',
  fields: [
    { id: 'strengths', name: '強み' },
    { id: 'weaknesses', name: '弱み' },
    { id: 'opportunities', name: '機会' },
    { id: 'threats', name: '脅威' },
    // クロスSWOT戦略もフィールドとして追加
    { id: 'soStrategy', name: 'SO戦略' },
    { id: 'woStrategy', name: 'WO戦略' },
    { id: 'stStrategy', name: 'ST戦略' },
    { id: 'wtStrategy', name: 'WT戦略' }
  ]
};

// API Clientを自動生成
export const swotAnalysisClient = createFrameworkApi(swotAnalysisFramework);