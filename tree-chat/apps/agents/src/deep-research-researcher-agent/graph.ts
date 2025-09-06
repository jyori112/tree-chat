import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ResearcherState, ResearcherStateType } from "./state.js";
import { RESEARCHER_SYSTEM_PROMPT } from "./prompts.js";
import { researcherTools } from "./tools.js";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Structured output schema for research results
const ResearchResultSchema = z.object({
  conclusion: z.string().describe('Main conclusion from the research'),
  evidence: z.array(z.string()).describe('List of key evidence points found'),
  sources: z.array(z.object({
    type: z.enum(['web', 'document', 'database', 'interview', 'survey']),
    title: z.string(),
    url: z.string().optional(),
    author: z.string().optional(),
    publishDate: z.string().optional(),
    relevance: z.number().min(0).max(1),
    credibility: z.number().min(0).max(1),
    excerpt: z.string()
  })).describe('List of sources used in the research'),
  additionalTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  })).optional().describe('Additional research tasks identified'),
  confidence: z.number().min(0).max(1).describe('Confidence level in the findings (0-1)'),
  completedAt: z.string().describe('ISO timestamp when research was completed')
});

// Research function using createReactAgent with responseFormat
async function conductResearch(state: ResearcherStateType): Promise<Partial<ResearcherStateType>> {
  try {
    const subTask = state.subTask;
    const originalIssue = state.originalIssue;

    if (!subTask || !originalIssue) {
      throw new Error("Missing required input: subTask or originalIssue");
    }

    console.log(`🔍 Researching SubTask: ${subTask.title}`);

    // Create a prompt for the ReAct agent with task context
    const researchPrompt = `
研究課題: ${originalIssue.title}
目的: ${originalIssue.objectives?.join(', ') || ''}

SubTask: ${subTask.title}
詳細: ${subTask.description}
優先度: ${subTask.priority}

この SubTask について徹底的に調査し、利用可能なツールを使って情報を収集してください。
検索が必要な場合は search_tool を使用し、十分な情報を収集した後、
構造化された結果を提供してください。
    `;

    // Create ReAct agent with structured output
    const reactAgent = createReactAgent({
      llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.1 }),
      tools: researcherTools,
      prompt: RESEARCHER_SYSTEM_PROMPT,
      responseFormat: ResearchResultSchema
    });

    // Execute ReAct agent with structured output
    const result = await reactAgent.invoke({
      messages: [{ role: "human", content: researchPrompt }]
    });

    // Extract structured response from the result
    const structuredResult = result.structuredResponse as z.infer<typeof ResearchResultSchema>;

    console.log(`✅ Research completed for: ${subTask.title}`);

    return {
      subTaskId: subTask.id,
      result: {
        conclusion: structuredResult.conclusion,
        evidence: structuredResult.evidence,
        sources: structuredResult.sources as any, // Type assertion for compatibility
        additionalTasks: structuredResult.additionalTasks as any, // Type assertion for compatibility
        confidence: structuredResult.confidence,
        completedAt: new Date().toISOString()
      },
      messages: result.messages,
      executionLog: `Research completed for SubTask: ${subTask.title}. Confidence: ${structuredResult.confidence}`
    };

  } catch (error) {
    console.error('Research error:', error);
    
    const fallbackResult = {
      conclusion: `${state.subTask?.title || 'SubTask'}の調査中にエラーが発生しました。`,
      evidence: [`調査プロセスでエラーが発生: ${error}`],
      sources: [],
      confidence: 0.1,
      completedAt: new Date().toISOString()
    };

    return {
      subTaskId: state.subTask?.id || 'unknown',
      result: fallbackResult,
      executionLog: `Research failed: ${error}`
    };
  }
}

// Build a simple graph with the research function
import { StateGraph } from "@langchain/langgraph";

const workflow = new StateGraph(ResearcherState)
  .addNode("conduct_research", conductResearch)
  .addEdge("__start__", "conduct_research") 
  .addEdge("conduct_research", "__end__");

export const graph = workflow.compile();