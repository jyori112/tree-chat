/**
 * Path Validation Utilities - Data Infrastructure
 * 
 * This module provides comprehensive path validation utilities with Unicode support,
 * length validation, path traversal prevention, and case sensitivity handling.
 * 
 * @see Requirements: EDGE-1, EDGE-2, EDGE-3, SEC-2
 */

import {
  PathValidationResult,
  PathValidationConfig,
  ValidationErrorCode,
  ValidationSeverity,
  SecurityConstraints,
  WorkspaceBoundaryConfig,
  ValidatedPath,
  ValidatedWorkspaceId,
  PATH_VALIDATION_CONSTANTS,
  PathNormalizationOptions,
} from '@tree-chat/shared';

/**
 * Default configuration for path validation operations
 */
const DEFAULT_PATH_CONFIG: Required<PathValidationConfig> = {
  maxLengthBytes: PATH_VALIDATION_CONSTANTS.MAX_PATH_LENGTH_BYTES,
  maxDepth: PATH_VALIDATION_CONSTANTS.MAX_PATH_DEPTH,
  allowUnicode: true,
  normalizeEncoding: true,
  customPatterns: [],
};

/**
 * Validates a hierarchical path with comprehensive security and format checks.
 * 
 * Handles Unicode correctly (EDGE-1), enforces DynamoDB length limits (EDGE-2),
 * maintains case sensitivity (EDGE-3), and prevents path traversal (SEC-2).
 * 
 * @param path - The path to validate
 * @param config - Optional validation configuration
 * @returns Detailed validation result with normalized path and metadata
 */
export function validatePath(
  path: string,
  config: PathValidationConfig = {}
): PathValidationResult {
  const finalConfig = { ...DEFAULT_PATH_CONFIG, ...config };
  const timestamp = new Date().toISOString();

  try {
    // Step 1: Basic format validation
    if (typeof path !== 'string') {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.INVALID_PATH_FORMAT,
          message: 'Path must be a string',
          severity: ValidationSeverity.ERROR,
        },
      };
    }

    if (path.length === 0) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.INVALID_PATH_FORMAT,
          message: 'Path cannot be empty',
          severity: ValidationSeverity.ERROR,
        },
      };
    }

    if (!path.startsWith('/')) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.INVALID_PATH_FORMAT,
          message: 'Path must start with forward slash',
          severity: ValidationSeverity.ERROR,
        },
      };
    }

    // Step 2: Unicode handling and encoding validation (EDGE-1)
    let normalizedPath = path;
    let pathBytes: number;
    let encoding = 'utf-8';

    try {
      if (finalConfig.normalizeEncoding) {
        // Normalize Unicode to NFC form for consistent representation
        normalizedPath = path.normalize('NFC');
      }

      // Calculate byte length for DynamoDB constraint validation
      pathBytes = Buffer.byteLength(normalizedPath, 'utf8');
      
      // Validate Unicode encoding correctness
      const encoded = Buffer.from(normalizedPath, 'utf8');
      const decoded = encoded.toString('utf8');
      if (decoded !== normalizedPath) {
        return {
          isValid: false,
          error: {
            code: ValidationErrorCode.INVALID_PATH_ENCODING,
            message: 'Path contains invalid Unicode encoding',
            severity: ValidationSeverity.ERROR,
          },
        };
      }
    } catch (encodingError) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.INVALID_PATH_ENCODING,
          message: 'Failed to process path encoding',
          severity: ValidationSeverity.ERROR,
        },
      };
    }

    // Step 3: Length validation for DynamoDB limits (EDGE-2)
    if (pathBytes > finalConfig.maxLengthBytes) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.PATH_TOO_LONG,
          message: `Path exceeds maximum length of ${finalConfig.maxLengthBytes} bytes (current: ${pathBytes} bytes)`,
          severity: ValidationSeverity.ERROR,
        },
        metadata: {
          lengthBytes: pathBytes,
          depth: 0,
          segments: [],
          encoding,
        },
      };
    }

    // Step 4: Path traversal security validation (SEC-2)
    if (PATH_VALIDATION_CONSTANTS.PATH_TRAVERSAL_PATTERN.test(normalizedPath)) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.PATH_TRAVERSAL_DETECTED,
          message: 'Path contains path traversal sequences',
          severity: ValidationSeverity.CRITICAL,
        },
      };
    }

    // Step 5: Reserved prefix validation
    const isReservedPrefix = PATH_VALIDATION_CONSTANTS.RESERVED_PREFIXES.some(
      (prefix: string) => normalizedPath.startsWith(prefix)
    );
    if (isReservedPrefix) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.RESERVED_PATH_PREFIX,
          message: 'Path uses reserved prefix',
          severity: ValidationSeverity.ERROR,
        },
      };
    }

    // Step 6: Parse and validate path segments
    const segments = normalizedPath
      .split('/')
      .filter(segment => segment.length > 0); // Remove empty segments from leading/trailing slashes

    // Validate depth limits
    if (segments.length > finalConfig.maxDepth) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.PATH_TOO_DEEP,
          message: `Path exceeds maximum depth of ${finalConfig.maxDepth} (current: ${segments.length})`,
          severity: ValidationSeverity.ERROR,
        },
        metadata: {
          lengthBytes: pathBytes,
          depth: segments.length,
          segments,
          encoding,
        },
      };
    }

    // Validate individual segments
    for (const segment of segments) {
      // Check for valid characters (allowing Unicode if configured)
      if (!finalConfig.allowUnicode) {
        if (!PATH_VALIDATION_CONSTANTS.VALID_SEGMENT_PATTERN.test(segment)) {
          return {
            isValid: false,
            error: {
              code: ValidationErrorCode.INVALID_PATH_FORMAT,
              message: 'Path segment contains invalid characters',
              severity: ValidationSeverity.ERROR,
            },
          };
        }
      } else {
        // For Unicode support, check for dangerous characters but allow valid Unicode
        if (segment.includes('..') || segment.includes('\0') || segment.includes('\n')) {
          return {
            isValid: false,
            error: {
              code: ValidationErrorCode.INVALID_PATH_FORMAT,
              message: 'Path segment contains dangerous characters',
              severity: ValidationSeverity.ERROR,
            },
          };
        }
      }
    }

    // Step 7: Apply custom validation patterns
    for (const customPattern of finalConfig.customPatterns) {
      if (!customPattern.pattern.test(normalizedPath)) {
        return {
          isValid: false,
          error: {
            code: ValidationErrorCode.INVALID_PATH_FORMAT,
            message: customPattern.errorMessage,
            severity: ValidationSeverity.ERROR,
          },
        };
      }
    }

    // Step 8: Return successful validation result
    return {
      isValid: true,
      normalizedPath,
      metadata: {
        lengthBytes: pathBytes,
        depth: segments.length,
        segments,
        encoding,
      },
    };
  } catch (error) {
    // Handle unexpected errors gracefully
    return {
      isValid: false,
      error: {
        code: ValidationErrorCode.INVALID_PATH_FORMAT,
        message: 'Unexpected error during path validation',
        severity: ValidationSeverity.ERROR,
      },
    };
  }
}

/**
 * Validates workspace boundary constraints to prevent unauthorized access.
 * Ensures paths cannot escape workspace boundaries (SEC-2).
 * 
 * @param path - The path to validate
 * @param config - Workspace boundary configuration
 * @returns Validation result indicating boundary compliance
 */
export function validateWorkspaceBoundary(
  path: string,
  config: WorkspaceBoundaryConfig
): PathValidationResult {
  const pathValidation = validatePath(path);
  
  if (!pathValidation.isValid) {
    return pathValidation;
  }

  const normalizedPath = pathValidation.normalizedPath!;
  const workspacePrefix = `/workspaces/${config.workspaceId}`;

  // Check if path is within workspace boundary
  if (!normalizedPath.startsWith(workspacePrefix)) {
    // Check if path is in exempt paths
    const isExempt = config.exemptPaths?.some((exemptPath: ValidatedPath) => 
      normalizedPath.startsWith(exemptPath)
    );

    if (!isExempt && !config.allowCrossWorkspace) {
      return {
        isValid: false,
        error: {
          code: ValidationErrorCode.WORKSPACE_BOUNDARY_VIOLATION,
          message: 'Path violates workspace boundary constraints',
          severity: ValidationSeverity.CRITICAL,
        },
      };
    }
  }

  return pathValidation;
}

/**
 * Normalizes a path according to specified options.
 * Handles Unicode normalization (EDGE-1) and case sensitivity preservation (EDGE-3).
 * 
 * @param path - The path to normalize
 * @param options - Normalization options
 * @returns Normalized path string
 */
export function normalizePath(
  path: string,
  options: PathNormalizationOptions = {}
): string {
  let normalized = path;

  // Unicode normalization (EDGE-1)
  if (options.normalizeUnicode !== false) {
    normalized = normalized.normalize('NFC');
  }

  // Case sensitivity is preserved by default (EDGE-3)
  // No case transformation unless explicitly requested

  // Collapse consecutive slashes
  if (options.collapseSlashes !== false) {
    normalized = normalized.replace(/\/+/g, '/');
  }

  // Remove trailing slash (except for root)
  if (options.removeTrailingSlash !== false && normalized.length > 1) {
    normalized = normalized.replace(/\/$/, '');
  }

  return normalized;
}

/**
 * Creates a type guard function that validates paths according to the specified configuration.
 * Returns a branded ValidatedPath type for compile-time safety.
 * 
 * @param config - Validation configuration
 * @returns Type guard function for validated paths
 */
export function createPathValidator(
  config: PathValidationConfig = {}
): (path: string) => path is ValidatedPath {
  return (path: string): path is ValidatedPath => {
    const result = validatePath(path, config);
    return result.isValid;
  };
}

/**
 * Utility function to extract path segments while preserving case sensitivity (EDGE-3).
 * 
 * @param path - The path to split into segments
 * @returns Array of path segments
 */
export function getPathSegments(path: string): string[] {
  const validation = validatePath(path);
  if (!validation.isValid || !validation.metadata) {
    return [];
  }
  return validation.metadata.segments;
}

/**
 * Calculates the byte length of a path for DynamoDB constraint validation (EDGE-2).
 * 
 * @param path - The path to measure
 * @returns Byte length of the path in UTF-8 encoding
 */
export function getPathByteLength(path: string): number {
  try {
    return Buffer.byteLength(path, 'utf8');
  } catch {
    return -1; // Invalid encoding
  }
}

/**
 * Checks if a path is within DynamoDB size constraints (EDGE-2).
 * 
 * @param path - The path to check
 * @param maxBytes - Maximum allowed bytes (default: 1000)
 * @returns True if path is within size limits
 */
export function isPathWithinSizeLimit(
  path: string,
  maxBytes: number = PATH_VALIDATION_CONSTANTS.MAX_PATH_LENGTH_BYTES
): boolean {
  const byteLength = getPathByteLength(path);
  return byteLength > 0 && byteLength <= maxBytes;
}

/**
 * Validates and creates a ValidatedPath branded type.
 * Throws an error if validation fails.
 * 
 * @param path - The path to validate
 * @param config - Optional validation configuration
 * @returns ValidatedPath branded type
 * @throws Error if validation fails
 */
export function createValidatedPath(
  path: string,
  config?: PathValidationConfig
): ValidatedPath {
  const result = validatePath(path, config);
  
  if (!result.isValid) {
    throw new Error(`Path validation failed: ${result.error?.message}`);
  }
  
  return result.normalizedPath as ValidatedPath;
}