/**
 * Business Model Canvas Agent - Framework定義ベース
 */

import { createFrameworkAgent } from '../shared/create-framework-agent.js';
import { businessModelCanvasDefinition } from '../frameworks/business-model-canvas.js';

// フレームワーク定義からエージェントを自動生成
export const graph = createFrameworkAgent(businessModelCanvasDefinition);