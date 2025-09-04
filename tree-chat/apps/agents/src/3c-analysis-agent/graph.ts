/**
 * 3C Analysis Agent - Framework定義ベース
 */

import { createFrameworkAgent } from '../shared/create-framework-agent.js';
import { threeCAnalysisDefinition } from '../frameworks/3c-analysis.js';

// フレームワーク定義からエージェントを自動生成
export const graph = createFrameworkAgent(threeCAnalysisDefinition);