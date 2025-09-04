import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BrainstormAgentState, type BrainstormAgentStateType, type BrainstormIdea } from "./state.js";
import { BRAINSTORM_SYSTEM_PROMPT, formatChatHistory, formatSelectedIdea } from "./prompts.js";
import { v4 as uuidv4 } from 'uuid';

// Initialize LLM
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.8, // Higher temperature for more creative brainstorming
});

// Function to parse ideas from LLM response
function parseIdeasFromResponse(responseText: string): BrainstormIdea[] {
  const ideas: BrainstormIdea[] = [];
  const sections = responseText.split(/### アイデア\d+:/);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    
    let title = '';
    let description = '';
    let category: 'product' | 'service' | 'platform' | 'other' = 'other';
    let targetMarket = '';
    let uniqueValue = '';
    
    // Extract title from the first line
    title = lines[0].trim();
    
    // Parse the rest of the content
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('- 概要:') || trimmedLine.startsWith('- 概要：')) {
        description = trimmedLine.replace(/^- 概要[：:]\s*/, '');
      } else if (trimmedLine.startsWith('- カテゴリ:') || trimmedLine.startsWith('- カテゴリ：')) {
        const categoryStr = trimmedLine.replace(/^- カテゴリ[：:]\s*/, '').toLowerCase();
        if (categoryStr.includes('product') || categoryStr.includes('製品')) {
          category = 'product';
        } else if (categoryStr.includes('service') || categoryStr.includes('サービス')) {
          category = 'service';
        } else if (categoryStr.includes('platform') || categoryStr.includes('プラットフォーム')) {
          category = 'platform';
        } else {
          category = 'other';
        }
      } else if (trimmedLine.startsWith('- ターゲット市場:') || trimmedLine.startsWith('- ターゲット市場：')) {
        targetMarket = trimmedLine.replace(/^- ターゲット市場[：:]\s*/, '');
      } else if (trimmedLine.startsWith('- 独自の価値:') || trimmedLine.startsWith('- 独自の価値：')) {
        uniqueValue = trimmedLine.replace(/^- 独自の価値[：:]\s*/, '');
      }
    }
    
    if (title && description) {
      ideas.push({
        id: uuidv4(),
        title,
        description,
        category,
        targetMarket: targetMarket || '未定義',
        uniqueValue: uniqueValue || description
      });
    }
  }
  
  return ideas;
}

// Main brainstorming node
async function processBrainstorm(state: BrainstormAgentStateType): Promise<Partial<BrainstormAgentStateType>> {
  console.log("Processing brainstorm with state:", JSON.stringify(state, null, 2));
  
  try {
    // Format the context
    const formattedChatHistory = formatChatHistory(state.chatHistory || []);
    const formattedSelectedIdea = formatSelectedIdea(state.selectedIdea);
    
    // Build the prompt
    const contextualPrompt = BRAINSTORM_SYSTEM_PROMPT
      .replace("{userInterests}", state.userInterests || "未指定")
      .replace("{chatHistory}", formattedChatHistory)
      .replace("{selectedIdea}", formattedSelectedIdea)
      .replace("{message}", state.message || "");
    
    console.log("Sending prompt to LLM:", contextualPrompt);

    // Call LLM
    const response = await llm.invoke([
      { role: "system", content: contextualPrompt }
    ]);

    console.log("LLM Response:", response.content);

    const responseText = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Check if we should parse ideas from the response
    const shouldParseIdeas = responseText.includes("## 事業アイデア提案") || 
                            responseText.includes("### アイデア");
    
    const ideas = shouldParseIdeas ? parseIdeasFromResponse(responseText) : [];
    
    console.log("Parsed ideas:", ideas);

    return {
      response: responseText,
      ideas: ideas,
      output: {
        success: true,
        response: responseText,
        ideas: ideas.length > 0 ? ideas : undefined
      }
    };

  } catch (error) {
    console.error("Error processing brainstorm:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      output: {
        success: false,
        response: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    };
  }
}

// Create the graph
const workflow = new StateGraph(BrainstormAgentState)
  .addNode("brainstorm", processBrainstorm)
  .addEdge("__start__", "brainstorm")
  .addEdge("brainstorm", "__end__");

// Compile the graph
export const graph = workflow.compile();