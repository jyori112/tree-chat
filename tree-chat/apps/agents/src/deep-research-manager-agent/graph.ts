import { StateGraph } from "@langchain/langgraph";
import { ManagerState, ManagerStateType } from "./state.js";
import { MANAGER_SYSTEM_PROMPT } from "./prompts.js";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

// Helper function to generate unique IDs
function generateId(): string {
  return `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Structured output schema for Manager decision
const ManagerOutputSchema = z.object({
  decision: z.enum(['continue', 'complete']).describe('Whether to continue research or complete it'),
  reasoning: z.string().describe('Explanation for the decision'),
  estimatedProgress: z.number().min(0).max(100).describe('Progress percentage (0-100)'),
  subTasks: z.array(z.object({
    id: z.string().describe('Unique ID for the subtask'),
    title: z.string().describe('Subtask title'),
    description: z.string().describe('Detailed description of what to research'),
    priority: z.enum(['high', 'medium', 'low']).describe('Priority level'),
    dependencies: z.array(z.string()).optional().describe('IDs of dependent subtasks')
  })).describe('Array of new subtasks to create (empty if decision is complete)')
});

// Manager decision node
async function managerDecision(state: ManagerStateType): Promise<Partial<ManagerStateType>> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
  }).withStructuredOutput(ManagerOutputSchema);

  try {
    // Format completed and pending tasks
    const completedTasks = state.completedSubTasks?.map(task => 
      `- ${task.title}: ${task.result?.conclusion || '結果待ち'}`
    ).join('\n') || '完了済みタスクなし';
    
    const pendingTasks = state.pendingSubTasks?.map(task => 
      `- ${task.title}: ${task.description}`
    ).join('\n') || '未完了タスクなし';

    // Single unified prompt
    const prompt = `研究課題: ${state.researchIssue?.title || ''}

概要: ${state.researchIssue?.description || ''}

背景: ${state.researchIssue?.background || 'なし'}

目標: ${state.researchIssue?.objectives?.join('\n- ') || ''}

範囲: ${state.researchIssue?.scope || ''}

制約: ${state.researchIssue?.constraints || 'なし'}

## 完了済みSubTask
${completedTasks}

## 未完了SubTask  
${pendingTasks}

現在の状況を分析し、以下を判断してください:
1. 初回の場合: 研究課題に対して包括的で深い調査を行うために必要なSubTaskを設計
2. 継続の場合: 既存の調査結果は十分か？追加調査が必要か？研究を完了すべきか？

判断理由と共に、次のアクションを決定してください。`;

    const structuredOutput = await model.invoke([
      new SystemMessage(MANAGER_SYSTEM_PROMPT),
      new HumanMessage(prompt)
    ]);

    console.log('Manager structured output:', JSON.stringify(structuredOutput, null, 2));

    // Generate unique IDs for subtasks if they don't have them
    const subTasksWithIds = structuredOutput.subTasks.map(task => ({
      ...task,
      id: task.id || generateId(),
      dependencies: task.dependencies || []
    }));

    return {
      decision: structuredOutput.decision,
      subTasks: subTasksWithIds,
      reasoning: structuredOutput.reasoning,
      estimatedProgress: structuredOutput.estimatedProgress,
      messages: [] // We can add a message here if needed
    };

  } catch (error) {
    console.error('Manager decision error:', error);
    return {
      decision: 'complete',
      reasoning: `エラーが発生しました: ${error}`,
      estimatedProgress: 0,
      subTasks: []
    };
  }
}


// Build the graph
const workflow = new StateGraph(ManagerState)
  .addNode("manager_decision", managerDecision)
  .addEdge("__start__", "manager_decision")
  .addEdge("manager_decision", "__end__");

export const graph = workflow.compile();