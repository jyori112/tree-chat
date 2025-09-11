/**
 * Session Validation Utilities
 * 
 * Centralized validation logic for session operations including title validation,
 * workspace boundary checks, and session data integrity validation. These utilities
 * ensure data consistency and security across all session management features.
 * 
 * @see Requirements: 1.2, 1.4, 4.5 (validation and security)
 */

import { 
  CreateSessionData, 
  Session, 
  SessionUpdateData, 
  SessionValidationError,
  isCreateSessionData,
  isSession 
} from '@/types/session';

/**
 * Configuration constants for session validation
 */
export const VALIDATION_CONSTANTS = {
  /** Maximum session title length */
  MAX_TITLE_LENGTH: 200,
  /** Maximum session description length */
  MAX_DESCRIPTION_LENGTH: 2000,
  /** Minimum session title length */
  MIN_TITLE_LENGTH: 1,
  /** Valid session ID format (UUID v4) */
  SESSION_ID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  /** Valid workspace ID format (Clerk organization ID) */
  WORKSPACE_ID_PATTERN: /^org_[a-zA-Z0-9]{24,}$/,
  /** Valid user ID format (Clerk user ID) */
  USER_ID_PATTERN: /^user_[a-zA-Z0-9]{24,}$/,
} as const;

/**
 * Validates session title for creation and updates.
 * 
 * @param title - The session title to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateSessionTitle(title: string | undefined): SessionValidationError | null {
  if (!title || typeof title !== 'string') {
    return {
      field: 'title',
      message: 'Session title is required',
      code: 'REQUIRED'
    };
  }

  const trimmedTitle = title.trim();
  
  if (trimmedTitle.length < VALIDATION_CONSTANTS.MIN_TITLE_LENGTH) {
    return {
      field: 'title',
      message: 'Session title is required',
      code: 'REQUIRED'
    };
  }

  if (trimmedTitle.length > VALIDATION_CONSTANTS.MAX_TITLE_LENGTH) {
    return {
      field: 'title',
      message: `Title must be ${VALIDATION_CONSTANTS.MAX_TITLE_LENGTH} characters or less`,
      code: 'TOO_LONG'
    };
  }

  // Check for potentially dangerous characters (basic XSS prevention)
  const dangerousPattern = /[<>\"'&]/;
  if (dangerousPattern.test(trimmedTitle)) {
    return {
      field: 'title',
      message: 'Title contains invalid characters',
      code: 'INVALID_CHARACTERS'
    };
  }

  return null;
}

/**
 * Validates session description for creation and updates.
 * 
 * @param description - The session description to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateSessionDescription(description: string | undefined): SessionValidationError | null {
  if (!description) {
    return null; // Description is optional
  }

  if (typeof description !== 'string') {
    return {
      field: 'description',
      message: 'Description must be text',
      code: 'INVALID_CHARACTERS'
    };
  }

  if (description.length > VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    return {
      field: 'description',
      message: `Description must be ${VALIDATION_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters or less`,
      code: 'TOO_LONG'
    };
  }

  // Check for potentially dangerous characters (basic XSS prevention)
  const dangerousPattern = /[<>]/;
  if (dangerousPattern.test(description)) {
    return {
      field: 'description',
      message: 'Description contains invalid characters',
      code: 'INVALID_CHARACTERS'
    };
  }

  return null;
}

/**
 * Validates session ID format.
 * 
 * @param sessionId - The session ID to validate
 * @returns true if valid UUID v4 format
 */
export function validateSessionId(sessionId: string): boolean {
  return typeof sessionId === 'string' && 
         VALIDATION_CONSTANTS.SESSION_ID_PATTERN.test(sessionId);
}

/**
 * Validates workspace ID format (Clerk organization ID).
 * 
 * @param workspaceId - The workspace ID to validate
 * @returns true if valid Clerk organization ID format
 */
export function validateWorkspaceId(workspaceId: string): boolean {
  return typeof workspaceId === 'string' && 
         VALIDATION_CONSTANTS.WORKSPACE_ID_PATTERN.test(workspaceId);
}

/**
 * Validates user ID format (Clerk user ID).
 * 
 * @param userId - The user ID to validate
 * @returns true if valid Clerk user ID format
 */
export function validateUserId(userId: string): boolean {
  return typeof userId === 'string' && 
         VALIDATION_CONSTANTS.USER_ID_PATTERN.test(userId);
}

/**
 * Validates CreateSessionData for session creation.
 * 
 * @param data - The session creation data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateCreateSessionData(data: any): SessionValidationError[] {
  const errors: SessionValidationError[] = [];

  // Type guard check
  if (!isCreateSessionData(data)) {
    errors.push({
      field: 'general',
      message: 'Invalid session data format',
      code: 'INVALID_CHARACTERS'
    });
    return errors;
  }

  // Validate title
  const titleError = validateSessionTitle(data.title);
  if (titleError) {
    errors.push(titleError);
  }

  // Validate description
  const descriptionError = validateSessionDescription(data.description);
  if (descriptionError) {
    errors.push(descriptionError);
  }

  return errors;
}

/**
 * Validates SessionUpdateData for session updates.
 * 
 * @param data - The session update data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateSessionUpdateData(data: SessionUpdateData): SessionValidationError[] {
  const errors: SessionValidationError[] = [];

  // Validate title if provided
  if (data.title !== undefined) {
    const titleError = validateSessionTitle(data.title);
    if (titleError) {
      errors.push(titleError);
    }
  }

  // Validate description if provided
  if (data.description !== undefined) {
    const descriptionError = validateSessionDescription(data.description);
    if (descriptionError) {
      errors.push(descriptionError);
    }
  }

  return errors;
}

/**
 * Validates complete Session object for data integrity.
 * 
 * @param session - The session object to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateSession(session: any): SessionValidationError[] {
  const errors: SessionValidationError[] = [];

  // Type guard check
  if (!isSession(session)) {
    errors.push({
      field: 'general',
      message: 'Invalid session object format',
      code: 'INVALID_CHARACTERS'
    });
    return errors;
  }

  // Validate session ID format
  if (!validateSessionId(session.id)) {
    errors.push({
      field: 'general',
      message: 'Invalid session ID format',
      code: 'INVALID_CHARACTERS'
    });
  }

  // Validate workspace ID format
  if (!validateWorkspaceId(session.workspaceId)) {
    errors.push({
      field: 'general',
      message: 'Invalid workspace ID format',
      code: 'WORKSPACE_MISMATCH'
    });
  }

  // Validate user ID format
  if (!validateUserId(session.userId)) {
    errors.push({
      field: 'general',
      message: 'Invalid user ID format',
      code: 'INVALID_CHARACTERS'
    });
  }

  // Validate title
  const titleError = validateSessionTitle(session.title);
  if (titleError) {
    errors.push(titleError);
  }

  // Validate description
  const descriptionError = validateSessionDescription(session.description);
  if (descriptionError) {
    errors.push(descriptionError);
  }

  // Validate timestamps
  if (session.createdAt <= 0 || session.updatedAt <= 0 || session.lastAccessedAt <= 0) {
    errors.push({
      field: 'general',
      message: 'Invalid timestamp values',
      code: 'INVALID_CHARACTERS'
    });
  }

  // Validate timestamp logic
  if (session.updatedAt < session.createdAt) {
    errors.push({
      field: 'general',
      message: 'Update timestamp cannot be before creation timestamp',
      code: 'INVALID_CHARACTERS'
    });
  }

  return errors;
}

/**
 * Validates workspace boundary - ensures session belongs to the specified workspace.
 * 
 * @param session - The session to validate
 * @param expectedWorkspaceId - The expected workspace ID
 * @returns ValidationError if workspace mismatch, null if valid
 */
export function validateWorkspaceBoundary(
  session: Session, 
  expectedWorkspaceId: string
): SessionValidationError | null {
  if (!validateWorkspaceId(expectedWorkspaceId)) {
    return {
      field: 'general',
      message: 'Invalid workspace ID format',
      code: 'WORKSPACE_MISMATCH'
    };
  }

  if (session.workspaceId !== expectedWorkspaceId) {
    return {
      field: 'general',
      message: 'Session does not belong to the specified workspace',
      code: 'WORKSPACE_MISMATCH'
    };
  }

  return null;
}

/**
 * Generates a new UUID v4 for session IDs.
 * 
 * @returns A valid UUID v4 string
 */
export function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Sanitizes user input for session title and description.
 * 
 * @param input - The input string to sanitize
 * @returns Sanitized string with trimmed whitespace and basic cleaning
 */
export function sanitizeInput(input: string | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove control characters but preserve line breaks for descriptions
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Validates and sanitizes CreateSessionData.
 * 
 * @param data - The raw session creation data
 * @returns Object with validated data and any validation errors
 */
export function validateAndSanitizeCreateSessionData(data: any): {
  validatedData: CreateSessionData | null;
  errors: SessionValidationError[];
} {
  const errors = validateCreateSessionData(data);
  
  if (errors.length > 0) {
    return { validatedData: null, errors };
  }

  const validatedData: CreateSessionData = {
    title: sanitizeInput(data.title),
    description: data.description ? sanitizeInput(data.description) : undefined
  };

  return { validatedData, errors: [] };
}

/**
 * Validates and sanitizes SessionUpdateData.
 * 
 * @param data - The raw session update data
 * @returns Object with validated data and any validation errors
 */
export function validateAndSanitizeSessionUpdateData(data: SessionUpdateData): {
  validatedData: SessionUpdateData | null;
  errors: SessionValidationError[];
} {
  const errors = validateSessionUpdateData(data);
  
  if (errors.length > 0) {
    return { validatedData: null, errors };
  }

  const validatedData: SessionUpdateData = {
    ...(data.title !== undefined && { title: sanitizeInput(data.title) }),
    ...(data.description !== undefined && { description: sanitizeInput(data.description) }),
    ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt }),
    ...(data.version !== undefined && { version: data.version })
  };

  return { validatedData, errors: [] };
}

/**
 * Checks if a session can be accessed by a specific user in a workspace.
 * 
 * @param session - The session to check
 * @param userId - The user ID attempting access
 * @param workspaceId - The workspace ID context
 * @returns true if access is allowed
 */
export function canAccessSession(
  session: Session, 
  userId: string, 
  workspaceId: string
): boolean {
  return (
    validateUserId(userId) &&
    validateWorkspaceId(workspaceId) &&
    session.workspaceId === workspaceId &&
    session.userId === userId
  );
}