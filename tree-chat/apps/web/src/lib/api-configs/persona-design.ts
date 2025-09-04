/**
 * Persona Design API Configuration
 */

import { createFrameworkApi } from '../create-framework-api';

// フレームワーク定義
const personaDesignFramework = {
  id: 'persona-design',
  name: 'ペルソナ設定',
  fields: [
    { id: 'basicInfo', name: '基本情報' },
    { id: 'background', name: '背景・経歴' },
    { id: 'goals', name: '目標・ゴール' },
    { id: 'frustrations', name: '悩み・フラストレーション' },
    { id: 'values', name: '価値観' },
    { id: 'dayInLife', name: '1日の過ごし方' },
    { id: 'touchpoints', name: 'タッチポイント' },
    { id: 'decisionFactors', name: '意思決定要因' },
    { id: 'relationToProduct', name: '製品・サービスとの関係' }
  ]
};

// API Clientを自動生成
export const personaDesignClient = createFrameworkApi(personaDesignFramework);