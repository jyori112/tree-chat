import { InterviewQuestion, FlattenedQuestion, TreeValidationResult } from './types';

export class TreeUtils {
  static findQuestionById(
    root: InterviewQuestion, 
    id: string
  ): InterviewQuestion | undefined {
    if (root.id === id) {
      return root;
    }

    if (root.children) {
      for (const child of root.children) {
        const found = this.findQuestionById(child, id);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  static findParentQuestion(
    root: InterviewQuestion, 
    childId: string
  ): InterviewQuestion | undefined {
    if (!root.children) {
      return undefined;
    }

    for (const child of root.children) {
      if (child.id === childId) {
        return root;
      }

      const foundInChild = this.findParentQuestion(child, childId);
      if (foundInChild) {
        return foundInChild;
      }
    }

    return undefined;
  }

  static getQuestionPath(
    root: InterviewQuestion, 
    targetId: string
  ): InterviewQuestion[] {
    const path: InterviewQuestion[] = [];
    
    const findPath = (question: InterviewQuestion): boolean => {
      path.push(question);
      
      if (question.id === targetId) {
        return true;
      }
      
      if (question.children) {
        for (const child of question.children) {
          if (findPath(child)) {
            return true;
          }
        }
      }
      
      path.pop();
      return false;
    };

    findPath(root);
    return path;
  }

  static flattenQuestions(
    question: InterviewQuestion, 
    level: number = 0,
    parentPath: string[] = []
  ): FlattenedQuestion[] {
    const current: FlattenedQuestion = {
      id: question.id,
      question: question.question,
      type: question.type,
      choices: question.choices,
      isAnswered: question.isAnswered,
      level,
      parentPath,
      parentId: parentPath.length > 0 ? parentPath[parentPath.length - 1] : undefined,
      children: question.children
    };

    const result = [current];

    if (question.isAnswered && question.children) {
      question.children.forEach(child => {
        result.push(...this.flattenQuestions(child, level + 1, [...parentPath, question.id]));
      });
    }

    return result;
  }

  static getVisibleQuestions(root: InterviewQuestion): FlattenedQuestion[] {
    return this.flattenQuestions(root);
  }

  static getUnansweredQuestions(root: InterviewQuestion): InterviewQuestion[] {
    const unanswered: InterviewQuestion[] = [];
    
    const traverse = (question: InterviewQuestion) => {
      if (!question.isAnswered) {
        unanswered.push(question);
      }
      
      if (question.isAnswered && question.children) {
        question.children.forEach(traverse);
      }
    };

    traverse(root);
    return unanswered;
  }

  static getNextUnansweredQuestion(root: InterviewQuestion): InterviewQuestion | undefined {
    const traverse = (question: InterviewQuestion): InterviewQuestion | undefined => {
      if (!question.isAnswered) {
        return question;
      }
      
      if (question.children) {
        for (const child of question.children) {
          const found = traverse(child);
          if (found) {
            return found;
          }
        }
      }
      
      return undefined;
    };

    return traverse(root);
  }

  static countQuestions(root: InterviewQuestion, onlyVisible: boolean = true): number {
    let count = 1;
    
    if (root.children && (!onlyVisible || root.isAnswered)) {
      for (const child of root.children) {
        count += this.countQuestions(child, onlyVisible);
      }
    }
    
    return count;
  }

  static countAnsweredQuestions(root: InterviewQuestion): number {
    let count = root.isAnswered ? 1 : 0;
    
    if (root.children && root.isAnswered) {
      for (const child of root.children) {
        count += this.countAnsweredQuestions(child);
      }
    }
    
    return count;
  }

  static isTreeComplete(root: InterviewQuestion): boolean {
    if (!root.isAnswered) {
      return false;
    }
    
    if (root.children) {
      return root.children.every(child => this.isTreeComplete(child));
    }
    
    return true;
  }

  static validateTree(root: InterviewQuestion): TreeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const visitedIds = new Set<string>();

    const validateQuestion = (question: InterviewQuestion, depth: number = 0) => {
      // Check for duplicate IDs
      if (visitedIds.has(question.id)) {
        errors.push(`Duplicate question ID found: ${question.id}`);
      } else {
        visitedIds.add(question.id);
      }

      // Check required fields
      if (!question.id || !question.question) {
        errors.push(`Question missing required fields: ${JSON.stringify(question)}`);
      }

      // Check choice questions have choices
      if (question.type === 'choice' && (!question.choices || question.choices.length === 0)) {
        errors.push(`Choice question ${question.id} has no choices`);
      }

      // Check answered questions have answers
      if (question.isAnswered && (!question.answer || question.answer.trim() === '')) {
        warnings.push(`Question ${question.id} is marked as answered but has no answer`);
      }

      // Check depth limit
      if (depth > 10) {
        warnings.push(`Question tree is very deep (depth: ${depth}). This might affect performance.`);
      }

      // Validate children
      if (question.children) {
        question.children.forEach(child => validateQuestion(child, depth + 1));
      }
    };

    validateQuestion(root);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static cloneQuestion(question: InterviewQuestion): InterviewQuestion {
    return {
      ...question,
      choices: question.choices ? [...question.choices] : undefined,
      children: question.children ? question.children.map(child => this.cloneQuestion(child)) : undefined,
      metadata: question.metadata ? { ...question.metadata } : undefined
    };
  }

  static addChildQuestion(
    root: InterviewQuestion,
    parentId: string,
    newQuestion: InterviewQuestion,
    insertIndex?: number
  ): InterviewQuestion {
    const cloned = this.cloneQuestion(root);
    const parent = this.findQuestionById(cloned, parentId);
    
    if (!parent) {
      throw new Error(`Parent question with ID ${parentId} not found`);
    }

    if (!parent.children) {
      parent.children = [];
    }

    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= parent.children.length) {
      parent.children.splice(insertIndex, 0, newQuestion);
    } else {
      parent.children.push(newQuestion);
    }

    return cloned;
  }

  static updateQuestion(
    root: InterviewQuestion,
    questionId: string,
    updates: Partial<InterviewQuestion>
  ): InterviewQuestion {
    const cloned = this.cloneQuestion(root);
    const question = this.findQuestionById(cloned, questionId);
    
    if (!question) {
      throw new Error(`Question with ID ${questionId} not found`);
    }

    Object.assign(question, updates);

    if (updates.metadata) {
      question.metadata = {
        ...question.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      };
    }

    return cloned;
  }

  static deleteQuestion(
    root: InterviewQuestion,
    questionId: string,
    preserveChildren: boolean = false
  ): InterviewQuestion {
    const cloned = this.cloneQuestion(root);
    
    if (cloned.id === questionId) {
      throw new Error('Cannot delete root question');
    }

    const parent = this.findParentQuestion(cloned, questionId);
    if (!parent || !parent.children) {
      throw new Error(`Question with ID ${questionId} not found`);
    }

    const questionIndex = parent.children.findIndex(child => child.id === questionId);
    if (questionIndex === -1) {
      throw new Error(`Question with ID ${questionId} not found in parent's children`);
    }

    const questionToDelete = parent.children[questionIndex];

    if (preserveChildren && questionToDelete.children) {
      parent.children.splice(questionIndex, 1, ...questionToDelete.children);
    } else {
      parent.children.splice(questionIndex, 1);
    }

    return cloned;
  }

  static reorderChildren(
    root: InterviewQuestion,
    parentId: string,
    childrenOrder: string[]
  ): InterviewQuestion {
    const cloned = this.cloneQuestion(root);
    const parent = this.findQuestionById(cloned, parentId);
    
    if (!parent || !parent.children) {
      throw new Error(`Parent question with ID ${parentId} not found or has no children`);
    }

    const reorderedChildren: InterviewQuestion[] = [];
    const childrenMap = new Map(parent.children.map(child => [child.id, child]));

    for (const childId of childrenOrder) {
      const child = childrenMap.get(childId);
      if (child) {
        reorderedChildren.push(child);
        childrenMap.delete(childId);
      }
    }

    // Add any remaining children that weren't in the order list
    for (const remainingChild of childrenMap.values()) {
      reorderedChildren.push(remainingChild);
    }

    parent.children = reorderedChildren;
    return cloned;
  }

  static searchQuestions(
    root: InterviewQuestion,
    searchTerm: string,
    searchInAnswers: boolean = false
  ): InterviewQuestion[] {
    const results: InterviewQuestion[] = [];
    const normalizedTerm = searchTerm.toLowerCase();

    const search = (question: InterviewQuestion) => {
      if (question.question.toLowerCase().includes(normalizedTerm) ||
          (searchInAnswers && question.answer?.toLowerCase().includes(normalizedTerm))) {
        results.push(question);
      }

      if (question.children) {
        question.children.forEach(search);
      }
    };

    search(root);
    return results;
  }

  static exportToJSON(root: InterviewQuestion): string {
    return JSON.stringify(root, null, 2);
  }

  static importFromJSON(jsonString: string): InterviewQuestion {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation
      if (!parsed.id || !parsed.question) {
        throw new Error('Invalid question format');
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to import question tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}