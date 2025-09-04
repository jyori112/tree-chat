import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BusinessChatAgentState, type BusinessChatAgentStateType } from "./state.js";
import { BUSINESS_CHAT_SYSTEM_PROMPT, formatCanvasData, formatChatHistory } from "./prompts.js";
import { tools } from "./tools.js";

// Initialize LLM with tools for web search (currently unused but kept for future tool integration)
// const llmWithTools = new ChatOpenAI({
//   model: "gpt-4o",
//   temperature: 0.7,
// }).bindTools(tools);

// Initialize LLM without tools for chat responses  
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.7,
});

// Node to determine if we need web search
async function shouldUseWebSearch(state: BusinessChatAgentStateType): Promise<Partial<BusinessChatAgentStateType>> {
  const message = state.message.toLowerCase();
  
  // Keywords that suggest we need current/real-time information
  const searchKeywords = [
    '最新', '現在', '今', '最近', '動向', 'トレンド', '市場', '競合', '業界',
    '価格', '相場', '統計', 'データ', '調査', '事例', '成功例', '失敗例'
  ];
  
  const needsSearch = searchKeywords.some(keyword => message.includes(keyword));
  
  return {
    searchQueries: needsSearch ? [state.message] : [],
    reasoning: needsSearch ? "Web検索が必要と判断されました" : "Web検索は不要と判断されました"
  };
}

// Node to perform web search if needed
async function performWebSearch(state: BusinessChatAgentStateType): Promise<Partial<BusinessChatAgentStateType>> {
  if (state.searchQueries.length === 0) {
    return { searchResults: "" };
  }
  
  try {
    const searchTool = tools[0]; // web_search tool
    const searchResult = await searchTool.invoke({ query: state.searchQueries[0] });
    
    return {
      searchResults: searchResult,
      reasoning: state.reasoning + "\n\nWeb検索を実行しました。"
    };
  } catch (error) {
    console.error("Web search failed:", error);
    return {
      searchResults: "",
      reasoning: state.reasoning + "\n\nWeb検索に失敗しました。既存の知識で回答します。"
    };
  }
}

// Function to parse canvas suggestions from LLM response and remove them from text
function parseCanvasSuggestions(responseText: string, canvasData: Record<string, string>): { suggestions: any[], cleanedText: string } {
  const suggestions = [];
  const lines = responseText.split('\n');
  let currentSection = '';
  let currentSuggestion = '';
  let currentReasoning = '';
  let isInSuggestionSection = false;
  let suggestionStartIndex = -1;
  
  const sectionMapping: Record<string, string> = {
    '課題': 'problem',
    '解決策': 'solution', 
    '主要指標': 'metrics',
    '価値提案': 'uvp',
    '優位性': 'advantage',
    'チャネル': 'channels',
    '顧客層': 'segments',
    'コスト': 'cost',
    '収益': 'revenue'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for the start of suggestions section
    if (line.includes('リーンキャンバス改善提案') || line.includes('## リーンキャンバス改善提案')) {
      isInSuggestionSection = true;
      if (suggestionStartIndex === -1) {
        suggestionStartIndex = i;
      }
      continue;
    }
    
    if (!isInSuggestionSection) continue;
    
    // Check for section header pattern: **[セクション名]の変更提案:**
    const sectionMatch = line.match(/\*\*(.+?)の変更提案[:：]?\*\*/);
    if (sectionMatch) {
      // Save previous suggestion if exists
      if (currentSection && currentSuggestion) {
        const sectionId = sectionMapping[currentSection];
        if (sectionId) {
          suggestions.push({
            sectionId,
            currentValue: canvasData[sectionId] || '',
            suggestedValue: currentSuggestion,
            reasoning: currentReasoning || '改善案です'
          });
        }
      }
      
      currentSection = sectionMatch[1];
      currentSuggestion = '';
      currentReasoning = '';
      continue;
    }
    
    // Parse suggestion content
    if (line.startsWith('- 提案:') || line.startsWith('- 提案：')) {
      currentSuggestion = line.replace(/^- 提案[：:]\s*/, '').trim();
    } else if (line.startsWith('- 理由:') || line.startsWith('- 理由：')) {
      currentReasoning = line.replace(/^- 理由[：:]\s*/, '').trim();
    }
  }
  
  // Save last suggestion
  if (currentSection && currentSuggestion) {
    const sectionId = sectionMapping[currentSection];
    if (sectionId) {
      suggestions.push({
        sectionId,
        currentValue: canvasData[sectionId] || '',
        suggestedValue: currentSuggestion,
        reasoning: currentReasoning || '改善案です'
      });
    }
  }
  
  // Remove suggestion section from the displayed text
  let cleanedText = responseText;
  if (suggestionStartIndex >= 0 && suggestions.length > 0) {
    const textLines = responseText.split('\n');
    cleanedText = textLines.slice(0, suggestionStartIndex).join('\n').trim();
  }
  
  return { suggestions, cleanedText };
}

// Main chat processing node
async function processBusinessChat(state: BusinessChatAgentStateType): Promise<Partial<BusinessChatAgentStateType>> {
  console.log("Processing business chat with state:", JSON.stringify(state, null, 2));
  
  // Check if we have required fields
  if (!state.businessName || !state.message) {
    return {
      error: "Invalid state - missing businessName or message",
      output: {
        success: false,
        response: "申し訳ございませんが、情報が不足しています。",
        errors: ["Invalid state structure"]
      }
    };
  }

  try {
    // Format the context
    const formattedCanvasData = formatCanvasData(state.canvasData || {});
    const formattedChatHistory = formatChatHistory(state.chatHistory || []);
    
    // Build the prompt with search results if available
    let contextualPrompt = BUSINESS_CHAT_SYSTEM_PROMPT
      .replace("{businessName}", state.businessName)
      .replace("{canvasData}", formattedCanvasData)
      .replace("{chatHistory}", formattedChatHistory)
      .replace("{message}", state.message);
    
    // Add search results to the prompt if available
    if (state.searchResults) {
      contextualPrompt += `\n\n最新の検索情報:\n${state.searchResults}`;
    }
    
    console.log("Sending prompt to LLM:", contextualPrompt);

    // Call LLM
    const response = await llm.invoke([
      { role: "system", content: contextualPrompt }
    ]);

    console.log("LLM Response:", response.content);

    const responseText = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Parse canvas suggestions from the response and get cleaned text
    const { suggestions: canvasSuggestions, cleanedText } = parseCanvasSuggestions(responseText, state.canvasData || {});
    console.log("Parsed canvas suggestions:", canvasSuggestions);
    console.log("Cleaned text:", cleanedText);

    return {
      response: cleanedText || responseText,
      output: {
        success: true,
        response: cleanedText || responseText,
        canvasSuggestions: canvasSuggestions.length > 0 ? canvasSuggestions : undefined,
        metadata: {
          reasoning: state.reasoning,
          searchQueries: state.searchQueries,
          model: "gpt-4o"
        }
      }
    };

  } catch (error) {
    console.error("Error processing business chat:", error);
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

// Create conditional logic for routing
function shouldSearch(state: BusinessChatAgentStateType): string {
  return state.searchQueries.length > 0 ? "web_search" : "chat";
}

// Create the graph
const workflow = new StateGraph(BusinessChatAgentState)
  .addNode("should_search", shouldUseWebSearch)
  .addNode("web_search", performWebSearch)
  .addNode("chat", processBusinessChat)
  .addEdge("__start__", "should_search")
  .addConditionalEdges("should_search", shouldSearch, {
    "web_search": "web_search",
    "chat": "chat"
  })
  .addEdge("web_search", "chat")
  .addEdge("chat", "__end__");

// Compile the graph
export const graph = workflow.compile();