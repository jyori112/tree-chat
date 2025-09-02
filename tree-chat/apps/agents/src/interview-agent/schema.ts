import { z } from "zod";

// Schema for individual question
export const QuestionSchema = z.object({
  id: z.string().describe("Unique identifier for the question"),
  question: z.string().describe("The question text to ask the user"),
  type: z.enum(["text", "textarea", "choice"]).describe("Type of input expected"),
  choices: z.array(z.string()).optional().describe("Available choices for choice-type questions"),
});

// Separate schemas for different command types
export const AddChildQuestionPayload = z.object({
  parentId: z.string().describe("ID of parent question"),
  question: QuestionSchema.describe("Question data to add"),
});

export const UpdateQuestionPayload = z.object({
  questionId: z.string().describe("ID of question to update"),
  updates: z.object({
    question: z.string().optional().describe("Updated question text"),
    type: z.enum(["text", "textarea", "choice"]).optional().describe("Updated input type"),
    choices: z.array(z.string()).optional().describe("Updated choices"),
  }).describe("Updates to apply"),
});

export const DeleteQuestionPayload = z.object({
  questionId: z.string().describe("ID of question to delete"),
});

// Schema for commands that will be sent back to frontend
export const CommandSchema = z.object({
  type: z.enum(["ADD_CHILD_QUESTION", "UPDATE_QUESTION", "DELETE_QUESTION"]).describe("Type of command to execute"),
  payload: z.union([
    AddChildQuestionPayload,
    UpdateQuestionPayload, 
    DeleteQuestionPayload
  ]).describe("Command payload - varies by command type"),
});

// Main structured output schema
export const InterviewResponseSchema = z.object({
  reasoning: z.string().describe("Your reasoning for generating these questions"),
  commands: z.array(CommandSchema).describe("List of commands to execute on the frontend"),
});

export type InterviewResponse = z.infer<typeof InterviewResponseSchema>;
export type Command = z.infer<typeof CommandSchema>;
export type Question = z.infer<typeof QuestionSchema>;