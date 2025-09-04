/**
 * Persona Design Agent - Framework定義ベース
 */

import { createFrameworkAgent } from '../shared/create-framework-agent.js';
import { personaDesignDefinition } from '../frameworks/persona-design.js';

// フレームワーク定義からエージェントを自動生成
export const graph = createFrameworkAgent(personaDesignDefinition);