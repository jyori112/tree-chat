import { graph } from './src/interview-agent/graph.js';

const testInput = {
  input: {
    command: {
      type: "ANSWER_QUESTION",
      payload: {
        questionId: "1",
        answer: "Web Application"
      }
    },
    currentState: {
      rootQuestion: {
        id: "1",
        question: "What type of project are you working on?",
        type: "choice",
        choices: ["Web Application", "Mobile App", "Data Analysis", "API/Backend"],
        answer: "Web Application",
        isAnswered: true,
        children: []
      },
      completedQuestionIds: ["1"],
      totalQuestions: 1,
      answeredCount: 1,
      isComplete: false,
      lastModified: "2025-01-01T00:00:00Z",
      version: 1
    }
  }
};

async function testInterviewAgent() {
  try {
    console.log("Testing Interview Agent...");
    console.log("Input:", JSON.stringify(testInput, null, 2));
    
    const result = await graph.invoke(testInput);
    
    console.log("\n=== RESULT ===");
    console.log("Success:", result.output?.success);
    console.log("Commands:", result.commands?.length || 0, "commands generated");
    console.log("Reasoning:", result.reasoning);
    
    if (result.commands) {
      result.commands.forEach((cmd, i) => {
        console.log(`\nCommand ${i + 1}:`, {
          type: cmd.type,
          payload: cmd.payload
        });
      });
    }
    
    if (result.error) {
      console.error("Error:", result.error);
    }
  } catch (error) {
    console.error("Test failed:", error.message);
    console.error(error.stack);
  }
}

testInterviewAgent();