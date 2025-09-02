/**
 * Configuration schema for business chat agent.
 */
export const ConfigurationSchema = {
  type: "object",
  properties: {
    enableWebSearch: {
      type: "boolean",
      description: "Whether to enable web search functionality",
      default: true
    },
    maxSearchResults: {
      type: "number",
      description: "Maximum number of search results to consider",
      default: 5
    }
  },
  additionalProperties: false,
} as const;