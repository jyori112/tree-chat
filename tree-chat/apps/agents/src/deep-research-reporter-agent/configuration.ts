import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

export const ConfigurationSchema = Annotation.Root({
  model: Annotation<string>,
  temperature: Annotation<number>,
  maxReportLength: Annotation<number>,
  includeAppendices: Annotation<boolean>,
  reportFormat: Annotation<string>,
  maxRecommendations: Annotation<number>,
  maxKeyFindings: Annotation<number>
});

export function ensureConfiguration(
  config: RunnableConfig,
): typeof ConfigurationSchema.State {
  const configurable = config.configurable ?? {};
  return {
    model: configurable.model ?? "claude-3-5-sonnet-20241022",
    temperature: configurable.temperature ?? 0.3,
    maxReportLength: configurable.maxReportLength ?? 10000,
    includeAppendices: configurable.includeAppendices ?? true,
    reportFormat: configurable.reportFormat ?? "markdown",
    maxRecommendations: configurable.maxRecommendations ?? 5,
    maxKeyFindings: configurable.maxKeyFindings ?? 10
  };
}