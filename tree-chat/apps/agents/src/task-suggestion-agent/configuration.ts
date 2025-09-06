import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

export const ConfigurationSchema = Annotation.Root({
  model: Annotation<string>,
  temperature: Annotation<number>,
  maxSuggestions: Annotation<number>,
});

export type ConfigurationType = typeof ConfigurationSchema.State;

export const DEFAULT_MODEL = "anthropic/claude-3-5-sonnet-20241022";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_SUGGESTIONS = 5;

export function ensureConfiguration(
  config?: RunnableConfig
): ConfigurationType {
  const configurable = config?.configurable ?? {};
  
  return {
    model: configurable.model ?? DEFAULT_MODEL,
    temperature: configurable.temperature ?? DEFAULT_TEMPERATURE,
    maxSuggestions: configurable.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS,
  };
}