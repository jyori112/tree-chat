import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

export const ConfigurationSchema = Annotation.Root({
  model: Annotation<string>,
  temperature: Annotation<number>,
  maxSubTasks: Annotation<number>,
  minSubTasks: Annotation<number>,
  completionThreshold: Annotation<number>
});

export function ensureConfiguration(
  config: RunnableConfig,
): typeof ConfigurationSchema.State {
  const configurable = config.configurable ?? {};
  return {
    model: configurable.model ?? "claude-3-5-sonnet-20241022",
    temperature: configurable.temperature ?? 0.3,
    maxSubTasks: configurable.maxSubTasks ?? 8,
    minSubTasks: configurable.minSubTasks ?? 3,
    completionThreshold: configurable.completionThreshold ?? 0.8
  };
}