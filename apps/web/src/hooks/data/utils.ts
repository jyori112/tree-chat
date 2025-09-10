/**
 * Data Infrastructure Utilities
 * 
 * Provides utility functions for caching, API communication, error handling,
 * and data validation used by the React data hooks.
 * 
 * @packageDocumentation
 */

import type { 
  CacheManager, 
  CacheEntry, 
  DataHookError,
  ReadResponse,
  WriteResponse,
  BatchResponse,
  TreeResponse,
  HookBatchOperation
} from './types'

/**
 * In-memory cache implementation for data hooks
 * 
 * Provides workspace-isolated caching with TTL support and automatic cleanup.
 * Uses a Map-based implementation optimized for read/write performance.
 * 
 * @example
 * ```typescript
 * const cache = new MemoryCache()
 * cache.set('workspace123', '/user/settings', { theme: 'dark' })
 * const entry = cache.get('workspace123', '/user/settings')
 * console.log(entry?.data) // { theme: 'dark' }
 * ```
 */
class MemoryCache implements CacheManager {
  /** Internal cache storage using Map for O(1) access */
  private cache = new Map<string, CacheEntry>()
  
  /** Default time-to-live for cache entries (5 minutes) */
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Generate a unique cache key for workspace and path combination
   * 
   * @param workspaceId - The workspace identifier
   * @param path - The hierarchical data path
   * @returns Combined cache key for unique identification
   * 
   * @internal
   */
  private getCacheKey(workspaceId: string, path: string): string {
    return `${workspaceId}:${path}`
  }

  /**
   * Retrieve cached data for a specific workspace and path
   * 
   * Automatically handles TTL expiration and removes stale entries.
   * Returns null if the entry doesn't exist or has expired.
   * 
   * @template T - The expected type of the cached data
   * @param workspaceId - The workspace identifier
   * @param path - The hierarchical data path
   * @returns The cached entry or null if not found/expired
   * 
   * @example
   * ```typescript
   * const userSettings = cache.get<UserSettings>('workspace123', '/user/settings')
   * if (userSettings) {
   *   console.log('Cached settings:', userSettings.data)
   * }
   * ```
   */
  get<T = any>(workspaceId: string, path: string): CacheEntry<T> | null {
    const key = this.getCacheKey(workspaceId, path)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry as CacheEntry<T>
  }

  /**
   * Store data in the cache with automatic timestamping
   * 
   * Creates a new cache entry with the current timestamp for TTL calculation.
   * Overwrites any existing entry for the same workspace/path combination.
   * 
   * @template T - The type of data being cached
   * @param workspaceId - The workspace identifier
   * @param path - The hierarchical data path
   * @param data - The data to cache
   * 
   * @example
   * ```typescript
   * cache.set('workspace123', '/user/profile', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * })
   * ```
   */
  set<T = any>(workspaceId: string, path: string, data: T): void {
    const key = this.getCacheKey(workspaceId, path)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      path,
      workspaceId
    }
    this.cache.set(key, entry)
  }

  /**
   * Invalidate cached entries for a workspace and optional path
   * 
   * If path is provided, invalidates only that specific entry.
   * If path is omitted, invalidates all entries for the workspace.
   * 
   * @param workspaceId - The workspace identifier
   * @param path - Optional specific path to invalidate
   * 
   * @example
   * ```typescript
   * // Invalidate specific path
   * cache.invalidate('workspace123', '/user/settings')
   * 
   * // Invalidate entire workspace
   * cache.invalidate('workspace123')
   * ```
   */
  invalidate(workspaceId: string, path?: string): void {
    if (path) {
      const key = this.getCacheKey(workspaceId, path)
      this.cache.delete(key)
    } else {
      // Invalidate all entries for workspace
      const keysToDelete: string[] = []
      this.cache.forEach((entry, key) => {
        if (entry.workspaceId === workspaceId) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => this.cache.delete(key))
    }
  }

  /**
   * Clear all cached entries
   * 
   * Removes all data from the cache across all workspaces.
   * Use with caution as this affects all cached data.
   * 
   * @example
   * ```typescript
   * cache.clear() // All cached data is removed
   * ```
   */
  clear(): void {
    this.cache.clear()
  }
}

/** 
 * Global cache instance for data hooks
 * 
 * Singleton cache instance used across all data hooks for consistent
 * caching behavior and memory management.
 * 
 * @example
 * ```typescript
 * import { dataCache } from './utils'
 * 
 * // Cache some data
 * dataCache.set('workspace123', '/user/settings', { theme: 'dark' })
 * 
 * // Retrieve cached data
 * const cached = dataCache.get('workspace123', '/user/settings')
 * ```
 */
export const dataCache = new MemoryCache()

/**
 * Parse API error responses into standardized data hook error types
 * 
 * Converts various error formats (Error objects, strings, HTTP responses)
 * into consistent DataHookError types for uniform error handling across hooks.
 * 
 * @param error - The error to parse (can be Error, string, or any object)
 * @returns Standardized error type for consistent handling
 * 
 * @example
 * ```typescript
 * try {
 *   await apiRequest(...)
 * } catch (error) {
 *   const hookError = parseApiError(error)
 *   console.log('Standardized error:', hookError) // 'NETWORK_ERROR', 'TIMEOUT', etc.
 * }
 * ```
 */
export function parseApiError(error: any): DataHookError {
  if (!error) return 'UNKNOWN_ERROR'
  
  const message = error.message || error.toString()
  
  if (message.includes('Authentication required')) {
    return 'AUTHENTICATION_REQUIRED'
  }
  
  if (message.includes('Access denied') || message.includes('Workspace')) {
    return 'WORKSPACE_ACCESS_DENIED'
  }
  
  if (message.includes('Invalid path') || message.includes('path')) {
    return 'INVALID_PATH'
  }
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'TIMEOUT'
  }
  
  if (message.includes('NetworkError') || message.includes('fetch')) {
    return 'NETWORK_ERROR'
  }
  
  return 'UNKNOWN_ERROR'
}

/**
 * Format error messages for user-friendly display
 * 
 * Converts standardized DataHookError types into human-readable messages
 * suitable for displaying to end users in the UI.
 * 
 * @param error - The standardized error type
 * @returns User-friendly error message string
 * 
 * @example
 * ```typescript
 * const error = parseApiError(someError)
 * const message = formatErrorMessage(error)
 * toast.error(message) // Shows user-friendly message
 * ```
 */
export function formatErrorMessage(error: DataHookError): string {
  switch (error) {
    case 'AUTHENTICATION_REQUIRED':
      return 'Authentication required. Please sign in.'
    case 'WORKSPACE_ACCESS_DENIED':
      return 'Access denied to workspace data.'
    case 'INVALID_PATH':
      return 'Invalid data path format.'
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection.'
    case 'TIMEOUT':
      return 'Request timed out. Please try again.'
    case 'UNKNOWN_ERROR':
    default:
      return 'An unknown error occurred.'
  }
}

/**
 * Validate hierarchical data path format
 * 
 * Performs basic validation on data paths to ensure they conform to
 * the expected format before making API calls. More comprehensive
 * validation is performed on the server side.
 * 
 * @param path - The path string to validate
 * @returns True if the path format is valid, false otherwise
 * 
 * @example
 * ```typescript
 * console.log(validatePath('/user/settings')) // true
 * console.log(validatePath('user/settings'))  // false (missing leading slash)
 * console.log(validatePath(''))               // false (empty string)
 * ```
 */
export function validatePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  // Additional path validation can be added here
  return true
}

/**
 * Generic API request helper with comprehensive error handling
 * 
 * Handles HTTP requests to data API endpoints with proper error parsing,
 * request cancellation support, and response type safety.
 * 
 * @template T - The expected response type
 * @param endpoint - The API endpoint path
 * @param body - The request body data
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Parsed response data
 * @throws Error with descriptive message for various failure scenarios
 * 
 * @internal
 * 
 * @example
 * ```typescript
 * const controller = new AbortController()
 * try {
 *   const result = await apiRequest<UserData>('/api/user', { id: 123 }, controller.signal)
 * } catch (error) {
 *   console.error('API request failed:', error.message)
 * }
 * ```
 */
async function apiRequest<T>(
  endpoint: string, 
  body: any,
  signal?: AbortSignal
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request cancelled')
    }
    throw error
  }
}

/**
 * Read data from a hierarchical path
 * 
 * Fetches data from the specified path within the workspace.
 * Returns null if the data doesn't exist (nullable-first design).
 * 
 * @param workspaceId - The workspace identifier
 * @param path - The hierarchical data path (e.g., '/user/settings')
 * @param signal - Optional signal for request cancellation
 * @returns Promise resolving to read response with data or null
 * 
 * @example
 * ```typescript
 * const response = await apiRead('workspace123', '/user/profile')
 * console.log('User profile:', response.data) // null if not found
 * ```
 */
export async function apiRead(
  workspaceId: string, 
  path: string,
  signal?: AbortSignal
): Promise<ReadResponse> {
  return apiRequest<ReadResponse>('/api/data/read', {
    workspaceId,
    path
  }, signal)
}

/**
 * Write data to a hierarchical path
 * 
 * Stores data at the specified path within the workspace.
 * Supports null values for explicit data deletion (nullable-first design).
 * 
 * @param workspaceId - The workspace identifier
 * @param path - The hierarchical data path (e.g., '/user/settings')
 * @param value - The data to store (can be null, objects, arrays, primitives)
 * @param signal - Optional signal for request cancellation
 * @returns Promise resolving to write confirmation
 * 
 * @example
 * ```typescript
 * // Write user settings
 * await apiWrite('workspace123', '/user/settings', { theme: 'dark' })
 * 
 * // Delete data by writing null
 * await apiWrite('workspace123', '/user/temp_data', null)
 * ```
 */
export async function apiWrite(
  workspaceId: string, 
  path: string, 
  value: any,
  signal?: AbortSignal
): Promise<WriteResponse> {
  return apiRequest<WriteResponse>('/api/data/write', {
    workspaceId,
    path,
    value
  }, signal)
}

/**
 * Read data with automatic default value fallback
 * 
 * Reads data from the path, but returns the provided default value
 * if the data doesn't exist. Eliminates null checks in calling code.
 * 
 * @param workspaceId - The workspace identifier
 * @param path - The hierarchical data path
 * @param defaultValue - The value to return if data doesn't exist
 * @param signal - Optional signal for request cancellation
 * @returns Promise resolving to data or default value (never null)
 * 
 * @example
 * ```typescript
 * const settings = await apiReadWithDefault('workspace123', '/user/settings', {
 *   theme: 'light',
 *   notifications: true
 * })
 * // Always returns a valid settings object, never null
 * ```
 */
export async function apiReadWithDefault(
  workspaceId: string, 
  path: string, 
  defaultValue: any,
  signal?: AbortSignal
): Promise<ReadResponse> {
  return apiRequest<ReadResponse>('/api/data/readWithDefault', {
    workspaceId,
    path,
    defaultValue
  }, signal)
}

/**
 * Query hierarchical data using path prefix matching
 * 
 * Retrieves all data items that begin with the specified path prefix.
 * Useful for getting all data under a particular hierarchy branch.
 * 
 * @param workspaceId - The workspace identifier
 * @param path - The path prefix to query (e.g., '/user' matches '/user/settings', '/user/profile')
 * @param signal - Optional signal for request cancellation
 * @returns Promise resolving to tree response with all matching items
 * 
 * @example
 * ```typescript
 * const treeData = await apiReadTree('workspace123', '/user')
 * console.log('All user data:', treeData.data)
 * // Returns: { '/user/settings': {...}, '/user/profile': {...}, ... }
 * ```
 */
export async function apiReadTree(
  workspaceId: string, 
  path: string,
  signal?: AbortSignal
): Promise<TreeResponse> {
  return apiRequest<TreeResponse>('/api/data/readTree', {
    workspaceId,
    path
  }, signal)
}

/**
 * Execute multiple data operations atomically
 * 
 * Performs a batch of read and write operations as a single atomic transaction.
 * All operations succeed together or all fail together (ACID properties).
 * 
 * @param workspaceId - The workspace identifier
 * @param operations - Array of batch operations (reads and writes)
 * @param signal - Optional signal for request cancellation
 * @returns Promise resolving to batch response with results for each operation
 * 
 * @example
 * ```typescript
 * const operations = [
 *   { type: 'write', path: '/user/name', value: 'John Doe' },
 *   { type: 'write', path: '/user/updated_at', value: new Date().toISOString() },
 *   { type: 'read', path: '/user/version' }
 * ]
 * const results = await apiBatch('workspace123', operations)
 * console.log('Batch results:', results.results)
 * ```
 */
export async function apiBatch(
  workspaceId: string, 
  operations: HookBatchOperation[],
  signal?: AbortSignal
): Promise<BatchResponse> {
  return apiRequest<BatchResponse>('/api/data/batch', {
    workspaceId,
    operations
  }, signal)
}

/**
 * Debounce function for optimizing frequent API calls
 * 
 * Creates a debounced version of a function that delays execution until
 * after the specified wait time has passed since the last invocation.
 * Useful for optimizing write operations and search queries.
 * 
 * @template T - The function type being debounced
 * @param func - The function to debounce
 * @param wait - The delay in milliseconds
 * @returns A debounced version of the function
 * 
 * @example
 * ```typescript
 * const debouncedSave = debounce((data: any) => {
 *   apiWrite('workspace123', '/user/draft', data)
 * }, 500) // Wait 500ms after last keystroke
 * 
 * // In a text input handler
 * onChange(event => debouncedSave(event.target.value))
 * ```
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

/**
 * Generate unique cache key for batch operations
 * 
 * Creates a deterministic cache key based on workspace ID and the set
 * of operations being performed. Used for caching batch operation results.
 * 
 * @param workspaceId - The workspace identifier
 * @param operations - Array of batch operations
 * @returns Unique cache key for the batch operation
 * 
 * @example
 * ```typescript
 * const operations = [
 *   { type: 'read', path: '/user/name' },
 *   { type: 'write', path: '/user/email', value: 'new@example.com' }
 * ]
 * const cacheKey = getBatchCacheKey('workspace123', operations)
 * // Returns: "batch:workspace123:read:/user/name,write:/user/email"
 * ```
 */
export function getBatchCacheKey(workspaceId: string, operations: HookBatchOperation[]): string {
  const operationPaths = operations.map(op => `${op.type}:${op.path}`).join(',')
  return `batch:${workspaceId}:${operationPaths}`
}

/**
 * Check if one path is an ancestor of another path
 * 
 * Determines if the ancestor path is a parent (direct or indirect) of the
 * descendant path in the hierarchical structure. Used for cache invalidation
 * and permission checking.
 * 
 * @param ancestorPath - The potential ancestor path
 * @param descendantPath - The potential descendant path
 * @returns True if ancestorPath is an ancestor of descendantPath
 * 
 * @example
 * ```typescript
 * console.log(isAncestorPath('/user', '/user/settings'))        // true
 * console.log(isAncestorPath('/user', '/user/settings/theme'))  // true
 * console.log(isAncestorPath('/user', '/user'))                 // true (same path)
 * console.log(isAncestorPath('/user', '/workspace'))            // false
 * console.log(isAncestorPath('/user/settings', '/user'))        // false (reverse)
 * ```
 */
export function isAncestorPath(ancestorPath: string, descendantPath: string): boolean {
  if (ancestorPath === descendantPath) return true
  if (!descendantPath.startsWith(ancestorPath)) return false
  
  // Ensure we're matching complete path segments
  const nextChar = descendantPath[ancestorPath.length]
  return nextChar === '/' || nextChar === undefined
}

/**
 * Get all cached paths that are descendants of a parent path
 * 
 * Finds all cached entries whose paths are descendants of the given parent path.
 * Used for intelligent cache invalidation when parent data changes.
 * 
 * @param workspaceId - The workspace to search within
 * @param parentPath - The parent path to find descendants for
 * @returns Array of descendant paths found in the cache
 * 
 * @example
 * ```typescript
 * // Assume cache contains: /user/settings, /user/profile, /user/data/temp, /workspace/config
 * const descendants = getDescendantPaths('workspace123', '/user')
 * console.log(descendants) // ['/user/settings', '/user/profile', '/user/data/temp']
 * 
 * // When /user data changes, invalidate all these descendant paths
 * descendants.forEach(path => dataCache.invalidate('workspace123', path))
 * ```
 */
export function getDescendantPaths(workspaceId: string, parentPath: string): string[] {
  const descendantPaths: string[] = []
  
  ;(dataCache as any).cache.forEach((entry: CacheEntry, key: string) => {
    if (entry.workspaceId === workspaceId && isAncestorPath(parentPath, entry.path)) {
      descendantPaths.push(entry.path)
    }
  })
  
  return descendantPaths
}