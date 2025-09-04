/**
 * Lean Canvas Agent - Framework定義ベース
 */

import { createFrameworkAgent } from '../shared/create-framework-agent.js';
import { leanCanvasDefinition } from '../frameworks/lean-canvas.js';

// フレームワーク定義からエージェントを自動生成
export const graph = createFrameworkAgent(leanCanvasDefinition);