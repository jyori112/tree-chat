import type { BatchOperation } from '@tree-chat/data-client'

/**
 * Common data hook state interface
 */
export interface DataHookState<T = any> {
  data: T | null
  loading: boolean
  error: string | null
  timestamp: string | null
}

/**
 * Read operation options
 */
export interface ReadOptions {
  /** Default value to return if data doesn't exist */
  defaultValue?: any
  /** Enable caching (default: true) */
  cache?: boolean
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDuration?: number
  /** Fetch immediately on mount (default: true) */
  immediate?: boolean
  /** Polling interval in milliseconds (optional) */
  pollInterval?: number
}

/**
 * Write operation options
 */
export interface WriteOptions {
  /** Enable optimistic updates (default: true) */
  optimistic?: boolean
  /** Invalidate cache after write (default: true) */
  invalidateCache?: boolean
  /** Custom success callback */
  onSuccess?: (data: any) => void
  /** Custom error callback */
  onError?: (error: string) => void
}

/**
 * Batch operation options
 */
export interface BatchOptions {
  /** Enable optimistic updates for writes (default: true) */
  optimistic?: boolean
  /** Invalidate cache after batch (default: true) */
  invalidateCache?: boolean
  /** Custom success callback */
  onSuccess?: (results: any[]) => void
  /** Custom error callback */
  onError?: (error: string) => void
}

/**
 * Tree read result
 */
export interface TreeNode {
  path: string
  value: any
  children?: TreeNode[]
}

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  path: string
  workspaceId: string
}

/**
 * Cache manager interface
 */
export interface CacheManager {
  get<T = any>(workspaceId: string, path: string): CacheEntry<T> | null
  set<T = any>(workspaceId: string, path: string, data: T): void
  invalidate(workspaceId: string, path?: string): void
  clear(): void
}

/**
 * Data hook error types
 */
export type DataHookError = 
  | 'AUTHENTICATION_REQUIRED'
  | 'WORKSPACE_ACCESS_DENIED'
  | 'INVALID_PATH'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR'

/**
 * Batch operation for hooks
 */
export interface HookBatchOperation extends Omit<BatchOperation, 'value'> {
  value?: any
  defaultValue?: any
}

/**
 * API response types
 */
export interface ReadResponse {
  data: any
  timestamp: string
}

export interface WriteResponse {
  success: boolean
  timestamp: string
}

export interface BatchResponse {
  results: any[]
  operationCount: number
  timestamp: string
}

export interface TreeResponse {
  tree: TreeNode[]
  timestamp: string
}