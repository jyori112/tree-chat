/**
 * Data Infrastructure Provider
 * 
 * Centralized data management system for the Tree Chat application.
 * Provides workspace-isolated data storage, real-time synchronization,
 * optimistic updates, and comprehensive caching capabilities.
 * 
 * @example
 * ```tsx
 * import { DataProvider, useData } from '@/providers/data'
 * 
 * function App() {
 *   return (
 *     <DataProvider config={{ debug: true }}>
 *       <MyComponent />
 *     </DataProvider>
 *   )
 * }
 * 
 * function MyComponent() {
 *   const { workspace, isLoading, switchWorkspace } = useData()
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   
 *   return (
 *     <div>
 *       Current workspace: {workspace.workspaceId}
 *       <button onClick={() => switchWorkspace('new-workspace')}>
 *         Switch Workspace
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */

// Main provider component
export { DataProvider, useDataProvider } from './DataProvider'

// Specialized hooks for different functionality
export {
  useData,
  useWorkspaceSwitcher,
  useCacheManager,
  useRealTimeSync,
  useWorkspaceChange,
  useAuthChange,
  useSyncEvents,
  useOptimisticUpdates,
  useDataProviderDebug,
  useIsInWorkspace,
  useIsPersonalWorkspace,
  useWorkspaceInfo,
  useConnectionStatus,
  useCacheMetrics,
  useDataRefresh
} from './hooks'

// Type exports
export type {
  // Core types
  DataProviderProps,
  DataProviderConfig,
  WorkspaceContext,
  SyncEvent,
  OptimisticUpdate,
  
  // Hook result types
  UseDataProviderResult,
  UseWorkspaceSwitcherResult,
  UseCacheManagerResult,
  UseRealTimeSyncResult,
  
  // Configuration types
  SyncConfig,
  CacheConfig,
  
  // State types
  DataProviderState
} from './types'

// Utility exports for advanced usage
export { 
  generateId,
  isValidWorkspaceId,
  getWorkspaceType,
  createCacheKey,
  parseCacheKey,
  pathMatchesPattern,
  debounce,
  throttle,
  formatErrorMessage,
  deepClone,
  deepEqual
} from './utils'

// Sync manager for advanced usage
export { SyncManager } from './SyncManager'
export type { ConnectionState } from './SyncManager'