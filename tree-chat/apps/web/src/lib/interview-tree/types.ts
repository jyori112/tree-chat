export interface InterviewQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "choice";
  choices?: string[];
  answer?: string;
  isAnswered: boolean;
  children?: InterviewQuestion[];
  priority?: 'high' | 'medium' | 'low'; // 優先度
  suggestedAnswers?: string[]; // LLMによる予測回答
  allowOther?: boolean; // Choice型でOther選択肢を許可するか
  metadata?: {
    level: number;
    parentId?: string;
    createdAt: Date;
    updatedAt: Date;
    source: 'initial' | 'generated' | 'user';
    businessImportance?: number; // ビジネス重要度スコア (1-10)
    urgency?: number; // 緊急度スコア (1-10)
  };
}

export type TreeCommandType = 
  | 'ANSWER_QUESTION'
  | 'ADD_CHILD_QUESTION'
  | 'UPDATE_QUESTION'
  | 'DELETE_QUESTION'
  | 'BATCH_UPDATE'
  | 'REORDER_CHILDREN'
  | 'MARK_COMPLETE';

export interface TreeCommand {
  id: string;
  type: TreeCommandType;
  payload: any;
  timestamp: Date;
  source: 'frontend' | 'langgraph' | 'user';
}

export interface AnswerQuestionPayload {
  questionId: string;
  answer: string;
}

export interface AddChildQuestionPayload {
  parentId: string;
  question: InterviewQuestion;
  insertIndex?: number;
}

export interface UpdateQuestionPayload {
  questionId: string;
  updates: Partial<InterviewQuestion>;
}

export interface DeleteQuestionPayload {
  questionId: string;
  preserveChildren?: boolean;
}

export interface BatchUpdatePayload {
  commands: Omit<TreeCommand, 'id' | 'timestamp' | 'source'>[];
}

export interface ReorderChildrenPayload {
  parentId: string;
  childrenOrder: string[];
}

export interface InterviewTreeState {
  rootQuestion: InterviewQuestion;
  currentQuestionId?: string;
  completedQuestionIds: Set<string>;
  totalQuestions: number;
  answeredCount: number;
  isComplete: boolean;
  lastModified: Date;
  version: number;
}

export interface CommandResult {
  success: boolean;
  error?: string;
  affectedQuestionIds: string[];
  newState?: InterviewTreeState;
}

export interface TreeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UseInterviewTreeOptions {
  enableUndo?: boolean;
  maxHistorySize?: number;
  onStateChange?: (state: InterviewTreeState) => void;
  onCommandExecuted?: (command: TreeCommand, result: CommandResult) => void;
  validateCommands?: boolean;
}

export interface UseInterviewTreeReturn {
  state: InterviewTreeState;
  executeCommand: (command: Omit<TreeCommand, 'id' | 'timestamp' | 'source'>) => CommandResult;
  answerQuestion: (questionId: string, answer: string) => Promise<CommandResult>;
  addChildQuestion: (parentId: string, question: Partial<InterviewQuestion>) => CommandResult;
  updateQuestion: (questionId: string, updates: Partial<InterviewQuestion>) => CommandResult;
  deleteQuestion: (questionId: string, preserveChildren?: boolean) => CommandResult;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  getQuestionById: (id: string) => InterviewQuestion | undefined;
  getQuestionPath: (id: string) => InterviewQuestion[];
  getUnansweredQuestions: () => InterviewQuestion[];
  getNextUnansweredQuestion: () => InterviewQuestion | undefined;
  validateTree: () => TreeValidationResult;
  exportState: () => string;
  importState: (stateJson: string) => boolean;
  reset: () => void;
}

export interface FlattenedQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "choice";
  choices?: string[];
  isAnswered: boolean;
  level: number;
  parentPath: string[];
  parentId?: string;
  children?: InterviewQuestion[];
}