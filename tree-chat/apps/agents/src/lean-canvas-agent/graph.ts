import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { LeanCanvasAgentState, type LeanCanvasAgentStateType } from "./state.js";
import { LEAN_CANVAS_SYSTEM_PROMPT, formatCanvasData } from "./prompts.js";
import { LeanCanvasResponseSchema } from "./schema.js";

// Initialize LLM with structured output
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.7,
}).withStructuredOutput(LeanCanvasResponseSchema);

// Main processing node
async function processLeanCanvas(state: LeanCanvasAgentStateType) {
  console.log("Processing lean canvas with state:", JSON.stringify(state, null, 2));
  
  // Check if we have the expected businessName and canvasData in the state
  if (!state.businessName || !state.canvasData) {
    console.log("Invalid state structure - missing businessName or canvasData");
    return {
      businessName: state.businessName,
      canvasData: state.canvasData,
      context: state.context,
      error: "Invalid state structure",
      output: {
        success: false,
        suggestions: [],
        errors: ["Invalid state structure - missing businessName or canvasData"]
      }
    };
  }

  try {
    // Extract context from the state
    const { businessName, canvasData } = state;
    
    // Format canvas data for the prompt
    const formattedCanvasData = formatCanvasData(canvasData);
    
    // Prepare the prompt
    const prompt = LEAN_CANVAS_SYSTEM_PROMPT
      .replace("{businessName}", businessName)
      .replace("{canvasData}", formattedCanvasData);

    console.log("Sending prompt to LLM:", prompt);

    // Call LLM with structured output
    const response = await llm.invoke([
      { role: "system", content: prompt }
    ]);

    console.log("LLM Response:", response);

    // Transform the response into the expected format
    const suggestions = response.suggestions.map(suggestion => ({
      sectionId: suggestion.sectionId,
      currentValue: suggestion.currentValue,
      suggestion: suggestion.suggestion,
      reasoning: suggestion.reasoning,
      priority: suggestion.priority,
      type: suggestion.type
    }));

    return {
      businessName: state.businessName,
      canvasData: state.canvasData,
      context: state.context,
      reasoning: response.reasoning,
      suggestions,
      output: {
        success: true,
        suggestions,
        metadata: {
          reasoning: response.reasoning,
          model: "gpt-4o",
          processingTime: Date.now()
        }
      }
    };

  } catch (error) {
    console.error("Error processing lean canvas:", error);
    return {
      businessName: state.businessName,
      canvasData: state.canvasData,
      context: state.context,
      error: error instanceof Error ? error.message : "Unknown error",
      output: {
        success: false,
        suggestions: [],
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    };
  }
}

// Create the graph with proper input handling
const workflow = new StateGraph(LeanCanvasAgentState)
  .addNode("process_lean_canvas", processLeanCanvas)
  .addEdge("__start__", "process_lean_canvas")
  .addEdge("process_lean_canvas", "__end__");

// Compile the graph
export const graph = workflow.compile();