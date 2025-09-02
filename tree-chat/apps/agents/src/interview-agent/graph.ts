import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from 'crypto';
import { InterviewAgentState, type InterviewAgentStateType } from "./state.js";
import { INTERVIEW_SYSTEM_PROMPT } from "./prompts.js";
import { InterviewResponseSchema } from "./schema.js";

// Initialize LLM with structured output
const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0.7,
}).withStructuredOutput(InterviewResponseSchema);

// Main processing node
async function processInterview(state: InterviewAgentStateType) {
  console.log("Processing interview with state:", JSON.stringify(state, null, 2));
  
  // Check if we have the expected command and currentState in the state
  if (!state.command || !state.currentState) {
    console.log("Invalid state structure - missing command or currentState");
    return {
      command: state.command,
      currentState: state.currentState,
      context: state.context,
      error: "Invalid state structure",
      output: {
        success: false,
        commands: [],
        errors: ["Invalid state structure"]
      }
    };
  }

  try {
    // Extract context from the state (which now contains the input fields directly)
    const { command, currentState } = state;
    const userAnswer = command.payload?.answer || "";
    const questionId = command.payload?.questionId || "";
    
    // Find the current question
    const findQuestion = (node: any, id: string): any => {
      if (node.id === id) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findQuestion(child, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const currentQuestion = findQuestion(currentState.rootQuestion, questionId);
    const currentQuestionText = currentQuestion?.question || "Unknown question";
    
    // Create tree context summary
    const treeContext = `
Total questions: ${currentState.totalQuestions}
Answered: ${currentState.answeredCount}
Current question ID: ${questionId}
Tree structure: ${JSON.stringify(currentState.rootQuestion, null, 2)}
    `;

    // Prepare the prompt
    const prompt = INTERVIEW_SYSTEM_PROMPT
      .replace("{tree_context}", treeContext)
      .replace("{user_answer}", userAnswer)
      .replace("{current_question}", currentQuestionText);

    console.log("Sending prompt to LLM:", prompt);

    // Call LLM with structured output
    const response = await llm.invoke([
      { role: "system", content: prompt }
    ]);

    console.log("LLM Response:", response);

    // Transform the response into the expected format
    const commands = response.commands.map(cmd => ({
      id: randomUUID(),
      type: cmd.type,
      payload: cmd.payload,
      timestamp: new Date(),
      source: "langgraph" as const
    }));

    return {
      command: state.command,
      currentState: state.currentState,
      context: state.context,
      reasoning: response.reasoning,
      commands,
      output: {
        success: true,
        commands,
        metadata: {
          reasoning: response.reasoning,
          model: "gpt-4o",
          processingTime: Date.now()
        }
      }
    };

  } catch (error) {
    console.error("Error processing interview:", error);
    return {
      command: state.command,
      currentState: state.currentState,
      context: state.context,
      error: error instanceof Error ? error.message : "Unknown error",
      output: {
        success: false,
        commands: [],
        errors: [error instanceof Error ? error.message : "Unknown error"]
      }
    };
  }
}

// Create the graph with proper input handling
const workflow = new StateGraph(InterviewAgentState)
  .addNode("process_interview", processInterview)
  .addEdge("__start__", "process_interview")
  .addEdge("process_interview", "__end__");

// Compile the graph
export const graph = workflow.compile();