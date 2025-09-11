/**
 * CreateSessionModal Component
 * 
 * Modal component for creating new sessions with form validation and error handling.
 * Integrates with the existing data hook infrastructure for session creation.
 * 
 * @see Requirements: 1.2, 1.3, 1.4 (session creation, validation, and data persistence)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Session } from '@/types/session';
import { useWritePath, useBatch } from '@/hooks/data';
import { 
  validateAndSanitizeCreateSessionData,
  generateSessionId 
} from '@/utils/session-validation';
import { 
  createSessionWithMetadata,
  getSessionDataPath 
} from '@/utils/session-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateSessionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current sessions list for batch updates */
  sessionsList: Session[];
  /** Callback when session is created */
  onSessionCreated?: (session: Session) => void;
  /** Default title to pre-fill (optional) */
  defaultTitle?: string;
  /** Default description to pre-fill (optional) */
  defaultDescription?: string;
}

/**
 * Modal component for creating new sessions with validation and error handling.
 */
export function CreateSessionModal({
  isOpen,
  onClose,
  sessionsList,
  onSessionCreated,
  defaultTitle = '',
  defaultDescription = ''
}: CreateSessionModalProps) {
  const { userId, orgId } = useAuth();
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Data hooks for session creation
  const { executeBatch } = useBatch();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      setErrors({});
      setGeneralError(null);
    }
  }, [isOpen, defaultTitle, defaultDescription]);

  // Handle form validation in real-time
  const validateForm = useCallback(() => {
    const { errors: validationErrors } = validateAndSanitizeCreateSessionData({
      title,
      description
    });

    const fieldErrors: Record<string, string> = {};
    validationErrors.forEach(error => {
      if (error.field !== 'general') {
        fieldErrors[error.field] = error.message;
      }
    });

    setErrors(fieldErrors);
    return validationErrors.length === 0;
  }, [title, description]);

  // Handle title input changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errors.title) {
      // Clear title errors when user starts typing
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  // Handle description input changes
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    if (errors.description) {
      // Clear description errors when user starts typing
      setErrors(prev => ({ ...prev, description: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!userId || !orgId) {
      setGeneralError('Authentication required. Please sign in.');
      return;
    }

    setIsCreating(true);
    setGeneralError(null);

    try {
      // Validate and sanitize input data
      const { validatedData, errors: validationErrors } = validateAndSanitizeCreateSessionData({
        title: title.trim(),
        description: description.trim() || undefined
      });

      if (validationErrors.length > 0 || !validatedData) {
        const fieldErrors: Record<string, string> = {};
        validationErrors.forEach(error => {
          if (error.field === 'general') {
            setGeneralError(error.message);
          } else {
            fieldErrors[error.field] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      // Generate session ID and create session object
      const sessionId = generateSessionId();
      const newSession = createSessionWithMetadata(
        validatedData,
        sessionId,
        orgId, // workspace ID
        userId
      );

      // Create batch operations for atomic session creation
      const operations = [
        {
          path: getSessionDataPath('detail', sessionId),
          value: newSession
        },
        {
          path: getSessionDataPath('list'),
          value: [newSession, ...sessionsList]
        }
      ];

      // Optimistic update
      onSessionCreated?.(newSession);
      
      // Execute batch creation
      await executeBatch(operations);

      // Success - close modal
      onClose();

    } catch (error) {
      console.error('Failed to create session:', error);
      setGeneralError('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isCreating) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      data-testid="create-session-modal"
    >
      <div 
        className="bg-background border rounded-lg shadow-lg p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create New Session</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isCreating}
            className="text-muted-foreground hover:text-foreground"
            data-testid="create-session-close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Field */}
          <div>
            <Label htmlFor="session-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="session-title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Enter session title..."
              disabled={isCreating}
              className={errors.title ? 'border-destructive' : ''}
              data-testid="session-title-input"
              autoFocus
              maxLength={200}
            />
            {errors.title && (
              <p 
                className="text-sm text-destructive mt-1" 
                data-testid="title-validation-error"
              >
                {errors.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/200 characters
            </p>
          </div>

          {/* Description Field */}
          <div>
            <Label htmlFor="session-description" className="text-sm font-medium">
              Description (optional)
            </Label>
            <Textarea
              id="session-description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Add a description for this session..."
              disabled={isCreating}
              className={`min-h-[80px] ${errors.description ? 'border-destructive' : ''}`}
              data-testid="session-description-input"
              maxLength={2000}
            />
            {errors.description && (
              <p 
                className="text-sm text-destructive mt-1" 
                data-testid="description-validation-error"
              >
                {errors.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/2000 characters
            </p>
          </div>

          {/* General Error Display */}
          {generalError && (
            <div 
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
              data-testid="create-session-error"
            >
              <p className="text-sm text-destructive">{generalError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              data-testid="create-session-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !title.trim()}
              data-testid="create-session-submit"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Session'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Hook for managing CreateSessionModal state
 */
export function useCreateSessionModal(sessionsList: Session[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');

  const open = useCallback((options?: { 
    title?: string; 
    description?: string; 
  }) => {
    setDefaultTitle(options?.title || '');
    setDefaultDescription(options?.description || '');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Clear defaults after closing
    setTimeout(() => {
      setDefaultTitle('');
      setDefaultDescription('');
    }, 200);
  }, []);

  const CreateSessionModalComponent = useCallback(
    (props: Omit<CreateSessionModalProps, 'isOpen' | 'onClose' | 'sessionsList' | 'defaultTitle' | 'defaultDescription'>) => (
      <CreateSessionModal
        {...props}
        isOpen={isOpen}
        onClose={close}
        sessionsList={sessionsList}
        defaultTitle={defaultTitle}
        defaultDescription={defaultDescription}
      />
    ),
    [isOpen, close, sessionsList, defaultTitle, defaultDescription]
  );

  return {
    isOpen,
    open,
    close,
    CreateSessionModal: CreateSessionModalComponent
  };
}