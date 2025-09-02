import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

/**
 * Tavily search tool configuration for business chat agent
 * This tool allows the agent to perform web searches using the Tavily API
 * to get current market information, competitor analysis, and business trends.
 */
const webSearchTool = new TavilySearchResults({
  maxResults: 5,
  name: "web_search",
  description: "Search the web for current information. Use this to find recent data, market trends, competitor information, or any other up-to-date information relevant to business questions.",
});

export const tools = [webSearchTool];