import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { VisualBrainstormAgentState, type VisualBrainstormAgentStateType } from "./state.js";
import { VISUAL_BRAINSTORM_SYSTEM_PROMPT, formatExistingKeywords, formatExistingIdeas } from "./prompts.js";
import { v4 as uuidv4 } from 'uuid';

// Initialize LLM
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.9, // High creativity for brainstorming
});

// Parse response to extract keywords, ideas, and questions
function parseResponse(responseText: string, category: string): any {
  const result = {
    keywords: [] as any[],
    ideas: [] as any[],
    newQuestions: [] as any[]
  };

  const lines = responseText.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Section headers
    if (trimmedLine.includes('抽出されたキーワード')) {
      currentSection = 'keywords';
      continue;
    } else if (trimmedLine.includes('事業アイデア')) {
      currentSection = 'ideas';
      continue;
    } else if (trimmedLine.includes('次の質問')) {
      currentSection = 'questions';
      continue;
    }

    // Parse keywords
    if (currentSection === 'keywords' && trimmedLine.startsWith('-')) {
      const match = trimmedLine.match(/- (.+?) \((.+?), (.+?)\)/);
      if (match) {
        const [, text, cat, size] = match;
        result.keywords.push({
          text,
          category: cat as any,
          size: size as any
        });
      } else {
        // Fallback parsing
        const text = trimmedLine.replace(/^- /, '').split('(')[0].trim();
        if (text) {
          result.keywords.push({
            text,
            category: category as any,
            size: 'medium'
          });
        }
      }
    }

    // Parse ideas
    if (currentSection === 'ideas') {
      if (trimmedLine.startsWith('### アイデア') || trimmedLine.startsWith('###')) {
        const title = trimmedLine.replace(/###\s*アイデア\d+:\s*/, '').replace(/###\s*/, '');
        if (title) {
          result.ideas.push({
            title,
            description: '',
            keywords: []
          });
        }
      } else if (trimmedLine.startsWith('説明:')) {
        if (result.ideas.length > 0) {
          result.ideas[result.ideas.length - 1].description = trimmedLine.replace('説明:', '').trim();
        }
      } else if (trimmedLine.startsWith('関連キーワード:')) {
        if (result.ideas.length > 0) {
          const keywords = trimmedLine.replace('関連キーワード:', '').split(',').map(k => k.trim());
          result.ideas[result.ideas.length - 1].keywords = keywords;
        }
      }
    }

    // Parse questions
    if (currentSection === 'questions' && trimmedLine.match(/^\d+\./)) {
      const match = trimmedLine.match(/^\d+\.\s*(.+?)\s*\((.+?)\)/);
      if (match) {
        const [, text, cat] = match;
        result.newQuestions.push({
          id: uuidv4(),
          text,
          category: cat as any
        });
      } else {
        // Fallback parsing
        const text = trimmedLine.replace(/^\d+\.\s*/, '');
        if (text) {
          result.newQuestions.push({
            id: uuidv4(),
            text,
            category: 'interest'
          });
        }
      }
    }
  }

  // Ensure we always have 3 questions
  while (result.newQuestions.length < 3) {
    const categories = ['interest', 'problem', 'skill', 'market'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const defaultQuestions = {
      interest: 'どのような活動に時間を使いたいですか？',
      problem: 'あなたの周りで改善できそうな問題は何ですか？',
      skill: 'これまでの経験で身につけたスキルは何ですか？',
      market: 'どのような人々を助けたいですか？'
    };
    
    result.newQuestions.push({
      id: uuidv4(),
      text: defaultQuestions[randomCat as keyof typeof defaultQuestions],
      category: randomCat as any
    });
  }

  return result;
}

// Main processing node
async function processVisualBrainstorm(state: VisualBrainstormAgentStateType): Promise<Partial<VisualBrainstormAgentStateType>> {
  console.log("Processing visual brainstorm with state:", JSON.stringify(state, null, 2));
  
  try {
    // Format existing data
    const formattedKeywords = formatExistingKeywords(state.existingKeywords || []);
    const formattedIdeas = formatExistingIdeas(state.existingIdeas || []);
    
    // Build prompt
    const prompt = VISUAL_BRAINSTORM_SYSTEM_PROMPT
      .replace("{question}", state.question)
      .replace("{category}", state.category)
      .replace("{answer}", state.answer)
      .replace("{existingKeywords}", formattedKeywords)
      .replace("{existingIdeas}", formattedIdeas);
    
    console.log("Sending prompt to LLM:", prompt);

    // Call LLM
    const response = await llm.invoke([
      { role: "system", content: prompt }
    ]);

    console.log("LLM Response:", response.content);

    const responseText = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Parse response
    const parsed = parseResponse(responseText, state.category);
    
    console.log("Parsed result:", parsed);

    return {
      keywords: parsed.keywords,
      ideas: parsed.ideas,
      newQuestions: parsed.newQuestions,
      output: {
        success: true,
        keywords: parsed.keywords,
        ideas: parsed.ideas,
        newQuestions: parsed.newQuestions
      }
    };

  } catch (error) {
    console.error("Error processing visual brainstorm:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      output: {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    };
  }
}

// Create the graph
const workflow = new StateGraph(VisualBrainstormAgentState)
  .addNode("process", processVisualBrainstorm)
  .addEdge("__start__", "process")
  .addEdge("process", "__end__");

// Compile the graph
export const graph = workflow.compile();