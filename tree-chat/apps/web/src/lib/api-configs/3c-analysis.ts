/**
 * 3C Analysis API Configuration
 */

import { createFrameworkApi } from '../create-framework-api';

// フレームワーク定義
const threeCAnalysisFramework = {
  id: '3c-analysis',
  name: '3C分析',
  fields: [
    { id: 'customer', name: '顧客（Customer）' },
    { id: 'competitor', name: '競合（Competitor）' },
    { id: 'company', name: '自社（Company）' },
    { id: 'strategy', name: '戦略的示唆' }
  ]
};

// API Clientを自動生成
export const threeCAnalysisClient = createFrameworkApi(threeCAnalysisFramework);