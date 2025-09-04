/**
 * SWOT Analysis Agent - Framework定義ベース
 */

import { createFrameworkAgent } from '../shared/create-framework-agent.js';
import { swotAnalysisDefinition } from '../frameworks/swot-analysis.js';

// フレームワーク定義からエージェントを自動生成
export const graph = createFrameworkAgent(swotAnalysisDefinition);