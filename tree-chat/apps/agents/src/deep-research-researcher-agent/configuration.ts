import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

export const ConfigurationSchema = Annotation.Root({
  model: Annotation<string>,
  temperature: Annotation<number>,
  maxSearchResults: Annotation<number>,
  searchDepth: Annotation<string>,
  minConfidence: Annotation<number>,
  maxRetries: Annotation<number>
});

export function ensureConfiguration(
  config: RunnableConfig,
): typeof ConfigurationSchema.State {
  const configurable = config.configurable ?? {};
  return {
    model: configurable.model ?? "claude-3-5-sonnet-20241022",
    temperature: configurable.temperature ?? 0.1,
    maxSearchResults: configurable.maxSearchResults ?? 5,
    searchDepth: configurable.searchDepth ?? "basic",
    minConfidence: configurable.minConfidence ?? 0.6,
    maxRetries: configurable.maxRetries ?? 2
  };
}