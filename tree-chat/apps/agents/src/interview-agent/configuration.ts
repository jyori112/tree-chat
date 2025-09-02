import type { LangGraphRunnableConfig } from "@langchain/langgraph";

export interface InterviewAgentConfig {
  model: string;
  temperature: number;
  maxQuestions: number;
}

export const configurable: LangGraphRunnableConfig["configurable"] = {
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxQuestions: 3,
};

export const config = { configurable };