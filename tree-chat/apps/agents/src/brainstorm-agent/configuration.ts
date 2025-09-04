export interface BrainstormAgentConfiguration {
  model?: string;
  temperature?: number;
  maxIdeas?: number;
}

export const brainstormAgentConfiguration: BrainstormAgentConfiguration = {
  model: "gpt-4o",
  temperature: 0.8,
  maxIdeas: 5,
};