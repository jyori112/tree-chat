import { useState, useCallback, useRef, useEffect } from 'react';
import {
  InterviewTreeState,
  UseInterviewTreeOptions,
  UseInterviewTreeReturn,
  TreeCommand,
  CommandResult,
  InterviewQuestion,
  TreeValidationResult
} from './types';
import { TreeCommandProcessor } from './command-processor';
import { TreeUtils } from './tree-utils';

interface HistoryEntry {
  state: InterviewTreeState;
  command: TreeCommand;
}

export function useInterviewTree(
  initialState: Partial<InterviewTreeState>,
  options: UseInterviewTreeOptions = {}
): UseInterviewTreeReturn {
  const {
    enableUndo = false,
    maxHistorySize = 50,
    onStateChange,
    onCommandExecuted,
    validateCommands = true
  } = options;

  // Create default initial state
  const createDefaultState = useCallback((): InterviewTreeState => {
    if (!initialState.rootQuestion) {
      throw new Error('Initial state must include rootQuestion');
    }

    const rootQuestion = initialState.rootQuestion;
    return {
      rootQuestion,
      currentQuestionId: undefined,
      completedQuestionIds: new Set<string>(),
      totalQuestions: TreeUtils.countQuestions(rootQuestion),
      answeredCount: TreeUtils.countAnsweredQuestions(rootQuestion),
      isComplete: TreeUtils.isTreeComplete(rootQuestion),
      lastModified: new Date(),
      version: 0,
      ...initialState
    };
  }, [initialState]);

  const [state, setState] = useState<InterviewTreeState>(createDefaultState);
  
  // History management
  const history = useRef<HistoryEntry[]>([]);
  const historyIndex = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryStatus = useCallback(() => {
    setCanUndo(historyIndex.current > 0);
    setCanRedo(historyIndex.current < history.current.length - 1);
  }, []);

  const addToHistory = useCallback((newState: InterviewTreeState, command: TreeCommand) => {
    if (!enableUndo) return;

    // Remove any redo entries
    if (historyIndex.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyIndex.current + 1);
    }

    // Add new entry
    history.current.push({ state: newState, command });
    historyIndex.current = history.current.length - 1;

    // Limit history size
    if (history.current.length > maxHistorySize) {
      const removeCount = history.current.length - maxHistorySize;
      history.current = history.current.slice(removeCount);
      historyIndex.current -= removeCount;
    }

    updateHistoryStatus();
  }, [enableUndo, maxHistorySize, updateHistoryStatus]);

  const executeCommand = useCallback((
    command: Omit<TreeCommand, 'id' | 'timestamp' | 'source'>
  ): CommandResult => {
    // Create complete command
    const fullCommand: TreeCommand = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      source: 'frontend',
      ...command
    };

    // Validate command if enabled
    if (validateCommands) {
      const validation = TreeCommandProcessor.validateCommand(fullCommand);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          affectedQuestionIds: []
        };
      }
    }

    // Execute command
    const { newState, result } = TreeCommandProcessor.applyCommand(state, fullCommand);

    if (result.success) {
      setState(newState);
      
      // Add to history
      addToHistory(newState, fullCommand);
      
      // Call callbacks
      onStateChange?.(newState);
      onCommandExecuted?.(fullCommand, result);
    }

    return result;
  }, [state, validateCommands, addToHistory, onStateChange, onCommandExecuted]);

  // API communication
  const callLangGraphAPI = useCallback(async (command: any) => {
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          currentState: {
            ...state,
            completedQuestionIds: Array.from(state.completedQuestionIds),
          },
          context: {
            timestamp: new Date().toISOString(),
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Apply commands from LangGraph response
      if (result.success && result.commands) {
        result.commands.forEach((cmd: any) => {
          executeCommand({
            type: cmd.type,
            payload: cmd.payload
          });
        });
      }
      
      return result;
    } catch (error) {
      console.error('LangGraph API call failed:', error);
      throw error;
    }
  }, [state, executeCommand]);

  // Enhanced answer method with backend integration
  const answerQuestion = useCallback(async (questionId: string, answer: string): Promise<CommandResult> => {
    // First, apply the answer locally (optimistic update)
    const localResult = executeCommand({
      type: 'ANSWER_QUESTION',
      payload: { questionId, answer }
    });

    // Then, send to backend for follow-up questions
    try {
      await callLangGraphAPI({
        type: 'ANSWER_QUESTION',
        payload: { questionId, answer }
      });
    } catch (error) {
      console.error('Failed to get follow-up questions:', error);
      // Local update already applied, so we don't revert
    }

    return localResult;
  }, [executeCommand, callLangGraphAPI]);

  const addChildQuestion = useCallback((
    parentId: string, 
    question: Partial<InterviewQuestion>
  ): CommandResult => {
    const completeQuestion: InterviewQuestion = {
      id: question.id || crypto.randomUUID(),
      question: question.question || '',
      type: question.type || 'text',
      choices: question.choices,
      answer: question.answer || '',
      isAnswered: question.isAnswered || false,
      children: question.children,
      metadata: {
        level: 0, // Will be set by command processor
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'user',
        ...question.metadata
      }
    };

    return executeCommand({
      type: 'ADD_CHILD_QUESTION',
      payload: { parentId, question: completeQuestion }
    });
  }, [executeCommand]);

  const updateQuestion = useCallback((
    questionId: string, 
    updates: Partial<InterviewQuestion>
  ): CommandResult => {
    return executeCommand({
      type: 'UPDATE_QUESTION',
      payload: { questionId, updates }
    });
  }, [executeCommand]);

  const deleteQuestion = useCallback((
    questionId: string, 
    preserveChildren: boolean = false
  ): CommandResult => {
    return executeCommand({
      type: 'DELETE_QUESTION',
      payload: { questionId, preserveChildren }
    });
  }, [executeCommand]);

  // Tree query methods
  const getQuestionById = useCallback((id: string): InterviewQuestion | undefined => {
    return TreeUtils.findQuestionById(state.rootQuestion, id);
  }, [state.rootQuestion]);

  const getQuestionPath = useCallback((id: string): InterviewQuestion[] => {
    return TreeUtils.getQuestionPath(state.rootQuestion, id);
  }, [state.rootQuestion]);

  const getUnansweredQuestions = useCallback((): InterviewQuestion[] => {
    const questions = TreeUtils.getUnansweredQuestions(state.rootQuestion);
    
    // 優先度でソート: high -> medium -> low -> undefined
    return questions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // 優先度が同じ場合は、ビジネス重要度とurgencyでソート
      const aScore = (a.metadata?.businessImportance ?? 5) + (a.metadata?.urgency ?? 5);
      const bScore = (b.metadata?.businessImportance ?? 5) + (b.metadata?.urgency ?? 5);
      
      return bScore - aScore; // 高いスコアから順に
    });
  }, [state.rootQuestion]);

  const getNextUnansweredQuestion = useCallback((): InterviewQuestion | undefined => {
    return TreeUtils.getNextUnansweredQuestion(state.rootQuestion);
  }, [state.rootQuestion]);

  const validateTree = useCallback((): TreeValidationResult => {
    return TreeUtils.validateTree(state.rootQuestion);
  }, [state.rootQuestion]);

  // History operations
  const undo = useCallback(() => {
    if (!enableUndo || historyIndex.current <= 0) return;

    historyIndex.current--;
    const previousEntry = history.current[historyIndex.current];
    setState(previousEntry.state);
    updateHistoryStatus();
    
    onStateChange?.(previousEntry.state);
  }, [enableUndo, updateHistoryStatus, onStateChange]);

  const redo = useCallback(() => {
    if (!enableUndo || historyIndex.current >= history.current.length - 1) return;

    historyIndex.current++;
    const nextEntry = history.current[historyIndex.current];
    setState(nextEntry.state);
    updateHistoryStatus();
    
    onStateChange?.(nextEntry.state);
  }, [enableUndo, updateHistoryStatus, onStateChange]);

  // Export/Import operations
  const exportState = useCallback((): string => {
    return JSON.stringify({
      ...state,
      completedQuestionIds: Array.from(state.completedQuestionIds)
    }, null, 2);
  }, [state]);

  const importState = useCallback((stateJson: string): boolean => {
    try {
      const parsed = JSON.parse(stateJson);
      
      // Validate required fields
      if (!parsed.rootQuestion || !parsed.rootQuestion.id) {
        return false;
      }

      // Recreate Set from array
      if (Array.isArray(parsed.completedQuestionIds)) {
        parsed.completedQuestionIds = new Set(parsed.completedQuestionIds);
      } else {
        parsed.completedQuestionIds = new Set();
      }

      // Recalculate derived fields
      const newState: InterviewTreeState = {
        ...parsed,
        totalQuestions: TreeUtils.countQuestions(parsed.rootQuestion),
        answeredCount: TreeUtils.countAnsweredQuestions(parsed.rootQuestion),
        isComplete: TreeUtils.isTreeComplete(parsed.rootQuestion),
        lastModified: new Date(),
        version: (parsed.version || 0) + 1
      };

      setState(newState);
      
      // Clear history when importing
      if (enableUndo) {
        history.current = [];
        historyIndex.current = -1;
        updateHistoryStatus();
      }
      
      onStateChange?.(newState);
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }, [enableUndo, updateHistoryStatus, onStateChange]);

  const reset = useCallback(() => {
    const resetState = createDefaultState();
    setState(resetState);
    
    // Clear history
    if (enableUndo) {
      history.current = [];
      historyIndex.current = -1;
      updateHistoryStatus();
    }
    
    onStateChange?.(resetState);
  }, [createDefaultState, enableUndo, updateHistoryStatus, onStateChange]);

  // Initialize history on first render
  useEffect(() => {
    if (enableUndo && history.current.length === 0) {
      // Add initial state to history
      const initialCommand: TreeCommand = {
        id: 'initial',
        type: 'MARK_COMPLETE', // Placeholder type
        payload: {},
        timestamp: new Date(),
        source: 'frontend'
      };
      history.current.push({ state, command: initialCommand });
      historyIndex.current = 0;
      updateHistoryStatus();
    }
  }, [enableUndo, state, updateHistoryStatus]);

  return {
    state,
    executeCommand,
    answerQuestion,
    addChildQuestion,
    updateQuestion,
    deleteQuestion,
    canUndo,
    canRedo,
    undo,
    redo,
    getQuestionById,
    getQuestionPath,
    getUnansweredQuestions,
    getNextUnansweredQuestion,
    validateTree,
    exportState,
    importState,
    reset
  };
}