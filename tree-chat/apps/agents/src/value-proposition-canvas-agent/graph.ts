/**
 * Value Proposition Canvas Agent - Framework定義ベース
 */

import { createFrameworkAgent } from '../shared/create-framework-agent.js';
import { valuePropositionCanvasDefinition } from '../frameworks/value-proposition-canvas.js';

// フレームワーク定義からエージェントを自動生成
export const graph = createFrameworkAgent(valuePropositionCanvasDefinition);