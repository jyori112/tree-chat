/**
 * Data Provider Types
 * 
 * Type definitions for the centralized data management provider
 * that handles workspace isolation, caching, and real-time synchronization.
 */

import type { CacheManager, DataHookState } from '@/hooks/data/types'
import type { User } from '@clerk/nextjs/server'

/**
 * Workspace context information
 */
export interface WorkspaceContext {
  workspaceId: string | null
  userId: string | null
  organizationId: string | null
  isPersonal: boolean
}

/**
 * Data synchronization configuration
 */
export interface SyncConfig {
  /** Enable real-time sync via WebSocket */
  enabled: boolean
  /** WebSocket server URL */
  wsUrl?: string
  /** Reconnection attempts */
  maxRetries: number
  /** Retry delay in milliseconds */
  retryDelay: number
  /** Heartbeat interval in milliseconds */
  heartbeatInterval: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean
  /** Default cache duration in milliseconds */
  defaultTTL: number
  /** Maximum cache size (number of entries) */
  maxSize: number
  /** Cache cleanup interval in milliseconds */
  cleanupInterval: number
}

/**
 * Data provider configuration
 */
export interface DataProviderConfig {
  /** Cache configuration */
  cache: CacheConfig
  /** Sync configuration */
  sync: SyncConfig
  /** Debug mode */
  debug?: boolean
}

/**
 * Optimistic update operation
 */
export interface OptimisticUpdate<T = any> {
  id: string
  path: string
  workspaceId: string
  operation: 'write' | 'delete'
  value: T
  previousValue: T | null
  timestamp: number
  rollback: () => Promise<void>
}

/**
 * Data provider state
 */
export interface DataProviderState {
  /** Current workspace context */
  workspace: WorkspaceContext
  /** Authentication state */
  isAuthenticated: boolean
  /** User information */
  user: User | null
  /** Connection state */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  /** Optimistic updates in progress */
  optimisticUpdates: Map<string, OptimisticUpdate>
  /** Global loading state */
  isLoading: boolean
  /** Global error state */
  error: string | null
  /** Last sync timestamp */
  lastSync: string | null
  /** Cache hit/miss statistics */
  cacheStats: {
    hits: number
    misses: number
    invalidations: number
  }
}

/**
 * Real-time sync event types
 */
export type SyncEventType = 
  | 'data_updated'
  | 'data_deleted' 
  | 'workspace_changed'
  | 'user_joined'
  | 'user_left'
  | 'connection_status'

/**
 * Real-time sync event
 */
export interface SyncEvent {
  type: SyncEventType
  workspaceId: string
  path?: string
  data?: any
  userId?: string
  timestamp: string
}

/**
 * Data provider context value
 */
export interface DataProviderContextValue {
  // State
  state: DataProviderState
  
  // Cache operations
  cache: CacheManager
  getCacheStats: () => { hits: number; misses: number; invalidations: number }
  clearCache: (workspaceId?: string) => void
  
  // Workspace operations  
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshWorkspace: () => Promise<void>
  
  // Optimistic updates
  addOptimisticUpdate: <T>(update: Omit<OptimisticUpdate<T>, 'id' | 'timestamp' | 'rollback'>) => string
  removeOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string) => Promise<boolean>
  rollbackAllOptimisticUpdates: () => Promise<void>
  
  // Real-time sync
  enableSync: () => void
  disableSync: () => void
  forcSync: () => Promise<void>
  
  // Data invalidation
  invalidatePath: (path: string, propagate?: boolean) => void
  invalidatePattern: (pattern: RegExp, propagate?: boolean) => void
  refreshPath: (path: string) => Promise<void>
  
  // Event subscriptions
  onSyncEvent: (callback: (event: SyncEvent) => void) => () => void
  onWorkspaceChange: (callback: (workspace: WorkspaceContext) => void) => () => void
  onAuthChange: (callback: (user: User | null) => void) => () => void
  
  // Debug utilities
  getProviderState: () => DataProviderState
  exportCache: () => Record<string, any>
  importCache: (data: Record<string, any>) => void
}

/**
 * Data provider props
 */
export interface DataProviderProps {
  children: React.ReactNode
  config?: Partial<DataProviderConfig>
  initialWorkspaceId?: string
  debug?: boolean
}

/**
 * Hook result for data provider access
 */
export interface UseDataProviderResult {
  // Core state
  isLoading: boolean
  error: string | null
  workspace: WorkspaceContext
  isAuthenticated: boolean
  
  // Operations
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshWorkspace: () => Promise<void>
  clearCache: (workspaceId?: string) => void
  invalidatePath: (path: string) => void
  refreshPath: (path: string) => Promise<void>
  
  // Statistics
  cacheStats: { hits: number; misses: number; invalidations: number }
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastSync: string | null
}

/**
 * Workspace switcher hook result
 */
export interface UseWorkspaceSwitcherResult {
  currentWorkspace: WorkspaceContext
  switchWorkspace: (workspaceId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

/**
 * Cache manager hook result
 */  
export interface UseCacheManagerResult {
  cacheStats: { hits: number; misses: number; invalidations: number }
  clearCache: (workspaceId?: string) => void
  invalidatePath: (path: string) => void
  invalidatePattern: (pattern: RegExp) => void
  refreshPath: (path: string) => Promise<void>
}

/**
 * Real-time sync hook result
 */
export interface UseRealTimeSyncResult {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastSync: string | null
  enableSync: () => void
  disableSync: () => void
  forceSync: () => Promise<void>
  onSyncEvent: (callback: (event: SyncEvent) => void) => () => void
}