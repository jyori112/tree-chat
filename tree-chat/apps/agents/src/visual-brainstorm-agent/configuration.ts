export interface VisualBrainstormAgentConfiguration {
  model?: string;
  temperature?: number;
  maxKeywords?: number;
  maxIdeas?: number;
}

export const visualBrainstormAgentConfiguration: VisualBrainstormAgentConfiguration = {
  model: "gpt-4o",
  temperature: 0.9,
  maxKeywords: 5,
  maxIdeas: 2,
};