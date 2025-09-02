import { 
  TreeCommand,
  TreeCommandType,
  InterviewTreeState,
  CommandResult,
  AnswerQuestionPayload,
  AddChildQuestionPayload,
  UpdateQuestionPayload,
  DeleteQuestionPayload,
  BatchUpdatePayload,
  ReorderChildrenPayload,
  InterviewQuestion
} from './types';
import { TreeUtils } from './tree-utils';
import { generateUUID } from '../utils/uuid';

export class TreeCommandProcessor {
  static applyCommand(
    state: InterviewTreeState,
    command: TreeCommand
  ): { newState: InterviewTreeState; result: CommandResult } {
    try {
      const result = this.executeCommand(state, command);
      
      if (!result.success) {
        return { newState: state, result };
      }

      const newState: InterviewTreeState = {
        ...state,
        rootQuestion: result.newState?.rootQuestion || state.rootQuestion,
        lastModified: new Date(),
        version: state.version + 1,
        totalQuestions: TreeUtils.countQuestions(result.newState?.rootQuestion || state.rootQuestion),
        answeredCount: TreeUtils.countAnsweredQuestions(result.newState?.rootQuestion || state.rootQuestion),
        isComplete: TreeUtils.isTreeComplete(result.newState?.rootQuestion || state.rootQuestion)
      };

      return {
        newState,
        result: {
          ...result,
          newState
        }
      };
    } catch (error) {
      return {
        newState: state,
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          affectedQuestionIds: []
        }
      };
    }
  }

  private static executeCommand(
    state: InterviewTreeState,
    command: TreeCommand
  ): CommandResult {
    switch (command.type) {
      case 'ANSWER_QUESTION':
        return this.handleAnswerQuestion(state, command.payload as AnswerQuestionPayload);
      
      case 'ADD_CHILD_QUESTION':
        return this.handleAddChildQuestion(state, command.payload as AddChildQuestionPayload);
      
      case 'UPDATE_QUESTION':
        return this.handleUpdateQuestion(state, command.payload as UpdateQuestionPayload);
      
      case 'DELETE_QUESTION':
        return this.handleDeleteQuestion(state, command.payload as DeleteQuestionPayload);
      
      case 'BATCH_UPDATE':
        return this.handleBatchUpdate(state, command.payload as BatchUpdatePayload);
      
      case 'REORDER_CHILDREN':
        return this.handleReorderChildren(state, command.payload as ReorderChildrenPayload);
      
      case 'MARK_COMPLETE':
        return this.handleMarkComplete(state);
      
      default:
        return {
          success: false,
          error: `Unknown command type: ${command.type}`,
          affectedQuestionIds: []
        };
    }
  }

  private static handleAnswerQuestion(
    state: InterviewTreeState,
    payload: AnswerQuestionPayload
  ): CommandResult {
    const { questionId, answer } = payload;

    if (!answer || answer.trim() === '') {
      return {
        success: false,
        error: 'Answer cannot be empty',
        affectedQuestionIds: [questionId]
      };
    }

    const question = TreeUtils.findQuestionById(state.rootQuestion, questionId);
    if (!question) {
      return {
        success: false,
        error: `Question with ID ${questionId} not found`,
        affectedQuestionIds: [questionId]
      };
    }

    // Validate answer for choice questions
    if (question.type === 'choice' && question.choices) {
      if (!question.choices.includes(answer)) {
        return {
          success: false,
          error: `Invalid choice: ${answer}. Valid choices are: ${question.choices.join(', ')}`,
          affectedQuestionIds: [questionId]
        };
      }
    }

    const updatedRoot = TreeUtils.updateQuestion(state.rootQuestion, questionId, {
      answer,
      isAnswered: true,
      metadata: {
        level: question.metadata?.level ?? 0,
        parentId: question.metadata?.parentId,
        createdAt: question.metadata?.createdAt ?? new Date(),
        source: question.metadata?.source ?? 'user',
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      affectedQuestionIds: [questionId],
      newState: {
        ...state,
        rootQuestion: updatedRoot,
        currentQuestionId: questionId,
        completedQuestionIds: new Set([...state.completedQuestionIds, questionId])
      }
    };
  }

  private static handleAddChildQuestion(
    state: InterviewTreeState,
    payload: AddChildQuestionPayload
  ): CommandResult {
    const { parentId, question, insertIndex } = payload;

    if (!question.id || !question.question) {
      return {
        success: false,
        error: 'Question must have id and question text',
        affectedQuestionIds: [parentId]
      };
    }

    // Check if question ID already exists
    if (TreeUtils.findQuestionById(state.rootQuestion, question.id)) {
      return {
        success: false,
        error: `Question with ID ${question.id} already exists`,
        affectedQuestionIds: [parentId, question.id]
      };
    }

    const parent = TreeUtils.findQuestionById(state.rootQuestion, parentId);
    if (!parent) {
      return {
        success: false,
        error: `Parent question with ID ${parentId} not found`,
        affectedQuestionIds: [parentId]
      };
    }

    if (!parent.isAnswered) {
      return {
        success: false,
        error: 'Cannot add child to unanswered question',
        affectedQuestionIds: [parentId]
      };
    }

    const completeQuestion: InterviewQuestion = {
      ...question,
      isAnswered: question.isAnswered || false,
      metadata: {
        level: (parent.metadata?.level || 0) + 1,
        parentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'generated',
        ...question.metadata
      }
    };

    const updatedRoot = TreeUtils.addChildQuestion(
      state.rootQuestion,
      parentId,
      completeQuestion,
      insertIndex
    );

    return {
      success: true,
      affectedQuestionIds: [parentId, question.id],
      newState: {
        ...state,
        rootQuestion: updatedRoot
      }
    };
  }

  private static handleUpdateQuestion(
    state: InterviewTreeState,
    payload: UpdateQuestionPayload
  ): CommandResult {
    const { questionId, updates } = payload;

    const question = TreeUtils.findQuestionById(state.rootQuestion, questionId);
    if (!question) {
      return {
        success: false,
        error: `Question with ID ${questionId} not found`,
        affectedQuestionIds: [questionId]
      };
    }

    // Don't allow changing ID
    if (updates.id && updates.id !== questionId) {
      return {
        success: false,
        error: 'Cannot change question ID',
        affectedQuestionIds: [questionId]
      };
    }

    // Validate choice updates
    if (updates.type === 'choice' && !updates.choices?.length) {
      return {
        success: false,
        error: 'Choice questions must have at least one choice',
        affectedQuestionIds: [questionId]
      };
    }

    const updatedRoot = TreeUtils.updateQuestion(state.rootQuestion, questionId, updates);

    return {
      success: true,
      affectedQuestionIds: [questionId],
      newState: {
        ...state,
        rootQuestion: updatedRoot
      }
    };
  }

  private static handleDeleteQuestion(
    state: InterviewTreeState,
    payload: DeleteQuestionPayload
  ): CommandResult {
    const { questionId, preserveChildren = false } = payload;

    if (questionId === state.rootQuestion.id) {
      return {
        success: false,
        error: 'Cannot delete root question',
        affectedQuestionIds: [questionId]
      };
    }

    const question = TreeUtils.findQuestionById(state.rootQuestion, questionId);
    if (!question) {
      return {
        success: false,
        error: `Question with ID ${questionId} not found`,
        affectedQuestionIds: [questionId]
      };
    }

    const affectedIds = [questionId];
    if (!preserveChildren && question.children) {
      const addChildrenIds = (children: InterviewQuestion[]) => {
        children.forEach(child => {
          affectedIds.push(child.id);
          if (child.children) {
            addChildrenIds(child.children);
          }
        });
      };
      addChildrenIds(question.children);
    }

    const updatedRoot = TreeUtils.deleteQuestion(state.rootQuestion, questionId, preserveChildren);

    // Update completedQuestionIds
    const newCompletedQuestionIds = new Set(state.completedQuestionIds);
    affectedIds.forEach(id => newCompletedQuestionIds.delete(id));

    return {
      success: true,
      affectedQuestionIds: affectedIds,
      newState: {
        ...state,
        rootQuestion: updatedRoot,
        completedQuestionIds: newCompletedQuestionIds,
        currentQuestionId: state.currentQuestionId === questionId ? undefined : state.currentQuestionId
      }
    };
  }

  private static handleBatchUpdate(
    state: InterviewTreeState,
    payload: BatchUpdatePayload
  ): CommandResult {
    let currentState = state;
    const allAffectedIds: string[] = [];
    const errors: string[] = [];

    for (const commandData of payload.commands) {
      const command: TreeCommand = {
        id: generateUUID(),
        timestamp: new Date(),
        source: 'frontend',
        ...commandData
      };

      const { newState, result } = this.applyCommand(currentState, command);
      
      if (result.success) {
        currentState = newState;
        allAffectedIds.push(...result.affectedQuestionIds);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      affectedQuestionIds: allAffectedIds,
      newState: currentState
    };
  }

  private static handleReorderChildren(
    state: InterviewTreeState,
    payload: ReorderChildrenPayload
  ): CommandResult {
    const { parentId, childrenOrder } = payload;

    const parent = TreeUtils.findQuestionById(state.rootQuestion, parentId);
    if (!parent) {
      return {
        success: false,
        error: `Parent question with ID ${parentId} not found`,
        affectedQuestionIds: [parentId]
      };
    }

    if (!parent.children || parent.children.length === 0) {
      return {
        success: false,
        error: `Question with ID ${parentId} has no children to reorder`,
        affectedQuestionIds: [parentId]
      };
    }

    const updatedRoot = TreeUtils.reorderChildren(state.rootQuestion, parentId, childrenOrder);

    return {
      success: true,
      affectedQuestionIds: [parentId, ...childrenOrder],
      newState: {
        ...state,
        rootQuestion: updatedRoot
      }
    };
  }

  private static handleMarkComplete(state: InterviewTreeState): CommandResult {
    return {
      success: true,
      affectedQuestionIds: [],
      newState: {
        ...state,
        isComplete: true
      }
    };
  }

  static validateCommand(command: TreeCommand): { isValid: boolean; error?: string } {
    if (!command.id || !command.type || !command.timestamp) {
      return { isValid: false, error: 'Command missing required fields' };
    }

    switch (command.type) {
      case 'ANSWER_QUESTION': {
        const answerPayload = command.payload as AnswerQuestionPayload;
        if (!answerPayload.questionId || answerPayload.answer === undefined) {
          return { isValid: false, error: 'ANSWER_QUESTION requires questionId and answer' };
        }
        break;
      }

      case 'ADD_CHILD_QUESTION': {
        const addPayload = command.payload as AddChildQuestionPayload;
        if (!addPayload.parentId || !addPayload.question) {
          return { isValid: false, error: 'ADD_CHILD_QUESTION requires parentId and question' };
        }
        break;
      }

      case 'UPDATE_QUESTION': {
        const updatePayload = command.payload as UpdateQuestionPayload;
        if (!updatePayload.questionId || !updatePayload.updates) {
          return { isValid: false, error: 'UPDATE_QUESTION requires questionId and updates' };
        }
        break;
      }

      case 'DELETE_QUESTION': {
        const deletePayload = command.payload as DeleteQuestionPayload;
        if (!deletePayload.questionId) {
          return { isValid: false, error: 'DELETE_QUESTION requires questionId' };
        }
        break;
      }

      case 'BATCH_UPDATE': {
        const batchPayload = command.payload as BatchUpdatePayload;
        if (!Array.isArray(batchPayload.commands)) {
          return { isValid: false, error: 'BATCH_UPDATE requires commands array' };
        }
        break;
      }

      case 'REORDER_CHILDREN': {
        const reorderPayload = command.payload as ReorderChildrenPayload;
        if (!reorderPayload.parentId || !Array.isArray(reorderPayload.childrenOrder)) {
          return { isValid: false, error: 'REORDER_CHILDREN requires parentId and childrenOrder array' };
        }
        break;
      }
    }

    return { isValid: true };
  }

  static createCommand(
    type: TreeCommandType,
    payload: any,
    source: 'frontend' | 'langgraph' | 'user' = 'frontend'
  ): TreeCommand {
    return {
      id: generateUUID(),
      type,
      payload,
      timestamp: new Date(),
      source
    };
  }
}