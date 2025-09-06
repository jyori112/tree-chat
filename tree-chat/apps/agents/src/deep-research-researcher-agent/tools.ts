import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Tavily Search Tool for web research
export const searchTool = new TavilySearchResults({
  maxResults: 5,
  searchDepth: "basic",
  includeAnswer: true,
  includeRawContent: true,
});

// Custom analysis tool for processing search results
export const analyzeSearchResults = tool(
  async ({ query: _query, searchResults, subTaskContext: _subTaskContext }): Promise<string> => {
    try {
      // Extract key information from search results
      const analysis = {
        totalResults: searchResults.length,
        keyFindings: [] as string[],
        sources: [] as any[],
        relevanceScore: 0
      };

      // Process each search result
      for (const result of searchResults) {
        if (result.content && result.content.length > 50) {
          analysis.keyFindings.push(result.content.substring(0, 200) + "...");
        }
        
        analysis.sources.push({
          title: result.title || 'Unknown Title',
          url: result.url || '',
          content: result.content || '',
          score: result.score || 0.5
        });
      }

      // Calculate overall relevance
      analysis.relevanceScore = analysis.sources.reduce((sum, source) => 
        sum + (source.score || 0.5), 0) / Math.max(analysis.sources.length, 1);

      return JSON.stringify(analysis, null, 2);
    } catch (error) {
      return `Analysis error: ${error}`;
    }
  },
  {
    name: "analyze_search_results",
    description: "Analyze and process search results for a specific research query",
    schema: z.object({
      query: z.string().describe("The research query"),
      searchResults: z.array(z.any()).describe("Array of search results to analyze"),
      subTaskContext: z.string().describe("Context about the subtask being researched")
    }),
  }
);

// Tool for identifying additional research tasks
export const identifyAdditionalTasks = tool(
  async ({ findings, originalTask, researchGaps }): Promise<string> => {
    try {
      const additionalTasks = [];
      
      // Analyze research gaps
      if (researchGaps && researchGaps.length > 0) {
        for (const gap of researchGaps) {
          additionalTasks.push({
            title: `${gap}の詳細調査`,
            description: `${originalTask}の調査中に特定された「${gap}」について更なる調査が必要`,
            priority: 'medium',
            reason: `研究中に重要な情報不足が判明`
          });
        }
      }

      // Check for incomplete findings
      if (findings.length < 3) {
        additionalTasks.push({
          title: `${originalTask}の補完調査`,
          description: `${originalTask}について、より多角的な情報収集が必要`,
          priority: 'high',
          reason: '十分な証拠が収集できていない'
        });
      }

      return JSON.stringify({
        recommendedTasks: additionalTasks,
        reasoning: "調査結果の分析に基づく追加タスクの提案"
      }, null, 2);
    } catch (error) {
      return `Additional tasks identification error: ${error}`;
    }
  },
  {
    name: "identify_additional_tasks", 
    description: "Identify additional research tasks based on current findings",
    schema: z.object({
      findings: z.array(z.string()).describe("Current research findings"),
      originalTask: z.string().describe("The original subtask being researched"),
      researchGaps: z.array(z.string()).describe("Identified gaps in the research")
    })
  }
);

export const researcherTools = [searchTool, analyzeSearchResults, identifyAdditionalTasks];