import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

/**
 * Tavily search tool configuration for business chat agent
 * This tool allows the agent to perform web searches using the Tavily API
 * to get current market information, competitor analysis, and business trends.
 */
const webSearchTool = new TavilySearchResults({
  maxResults: 5,
});

export const tools = [webSearchTool];