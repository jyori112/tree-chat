/**
 * Data Provider Hooks
 * 
 * Custom hooks for accessing different aspects of the data provider
 * functionality. These hooks provide convenient access to specific
 * features without exposing the entire provider context.
 */

import { useCallback } from 'react'
import { useDataProvider } from './DataProvider'
import type { 
  UseDataProviderResult,
  UseWorkspaceSwitcherResult,
  UseCacheManagerResult,
  UseRealTimeSyncResult,
  SyncEvent,
  WorkspaceContext
} from './types'

/**
 * Main hook for accessing data provider functionality
 * 
 * @returns Core data provider state and operations
 */
export function useData(): UseDataProviderResult {
  const provider = useDataProvider()
  
  return {
    isLoading: provider.state.isLoading,
    error: provider.state.error,
    workspace: provider.state.workspace,
    isAuthenticated: provider.state.isAuthenticated,
    switchWorkspace: provider.switchWorkspace,
    refreshWorkspace: provider.refreshWorkspace,
    clearCache: provider.clearCache,
    invalidatePath: provider.invalidatePath,
    refreshPath: provider.refreshPath,
    cacheStats: provider.state.cacheStats,
    connectionState: provider.state.connectionState,
    lastSync: provider.state.lastSync
  }
}

/**
 * Hook for workspace switching functionality
 * 
 * @returns Workspace switching state and operations
 */
export function useWorkspaceSwitcher(): UseWorkspaceSwitcherResult {
  const provider = useDataProvider()
  
  return {
    currentWorkspace: provider.state.workspace,
    switchWorkspace: provider.switchWorkspace,
    isLoading: provider.state.isLoading,
    error: provider.state.error
  }
}

/**
 * Hook for cache management operations
 * 
 * @returns Cache management state and operations
 */
export function useCacheManager(): UseCacheManagerResult {
  const provider = useDataProvider()
  
  const invalidatePattern = useCallback((pattern: RegExp) => {
    provider.invalidatePattern(pattern)
  }, [provider])
  
  return {
    cacheStats: provider.state.cacheStats,
    clearCache: provider.clearCache,
    invalidatePath: provider.invalidatePath,
    invalidatePattern,
    refreshPath: provider.refreshPath
  }
}

/**
 * Hook for real-time synchronization functionality
 * 
 * @returns Real-time sync state and operations
 */
export function useRealTimeSync(): UseRealTimeSyncResult {
  const provider = useDataProvider()
  
  return {
    connectionState: provider.state.connectionState,
    lastSync: provider.state.lastSync,
    enableSync: provider.enableSync,
    disableSync: provider.disableSync,
    forceSync: provider.forcSync,
    onSyncEvent: provider.onSyncEvent
  }
}

/**
 * Hook for subscribing to workspace changes
 * 
 * @param callback - Function to call when workspace changes
 * @returns Cleanup function to remove the subscription
 */
export function useWorkspaceChange(callback: (workspace: WorkspaceContext) => void) {
  const provider = useDataProvider()
  return provider.onWorkspaceChange(callback)
}

/**
 * Hook for subscribing to authentication changes
 * 
 * @param callback - Function to call when authentication state changes
 * @returns Cleanup function to remove the subscription
 */
export function useAuthChange(callback: (user: any) => void) {
  const provider = useDataProvider()
  return provider.onAuthChange(callback)
}

/**
 * Hook for subscribing to real-time sync events
 * 
 * @param callback - Function to call when sync events occur
 * @returns Cleanup function to remove the subscription
 */
export function useSyncEvents(callback: (event: SyncEvent) => void) {
  const provider = useDataProvider()
  return provider.onSyncEvent(callback)
}

/**
 * Hook for optimistic updates management
 * 
 * @returns Optimistic updates operations
 */
export function useOptimisticUpdates() {
  const provider = useDataProvider()
  
  return {
    optimisticUpdates: provider.state.optimisticUpdates,
    addOptimisticUpdate: provider.addOptimisticUpdate,
    removeOptimisticUpdate: provider.removeOptimisticUpdate,
    rollbackOptimisticUpdate: provider.rollbackOptimisticUpdate,
    rollbackAllOptimisticUpdates: provider.rollbackAllOptimisticUpdates
  }
}

/**
 * Hook for accessing debug utilities
 * 
 * @returns Debug utilities and state inspection tools
 */
export function useDataProviderDebug() {
  const provider = useDataProvider()
  
  return {
    getProviderState: provider.getProviderState,
    exportCache: provider.exportCache,
    importCache: provider.importCache,
    cacheStats: provider.state.cacheStats,
    optimisticUpdatesCount: provider.state.optimisticUpdates.size
  }
}

/**
 * Hook for checking if user is in a specific workspace
 * 
 * @param workspaceId - The workspace ID to check
 * @returns Whether the user is currently in the specified workspace
 */
export function useIsInWorkspace(workspaceId: string): boolean {
  const { workspace } = useData()
  return workspace.workspaceId === workspaceId
}

/**
 * Hook for checking if the current workspace is personal
 * 
 * @returns Whether the current workspace is a personal workspace
 */
export function useIsPersonalWorkspace(): boolean {
  const { workspace } = useData()
  return workspace.isPersonal
}

/**
 * Hook for getting workspace display information
 * 
 * @returns Workspace display name and type information
 */
export function useWorkspaceInfo() {
  const { workspace } = useData()
  
  const displayName = workspace.isPersonal 
    ? 'Personal Workspace'
    : `Organization (${workspace.organizationId})`
    
  const workspaceType = workspace.isPersonal ? 'personal' : 'organization'
  
  return {
    workspaceId: workspace.workspaceId,
    displayName,
    type: workspaceType,
    isPersonal: workspace.isPersonal,
    userId: workspace.userId,
    organizationId: workspace.organizationId
  }
}

/**
 * Hook for data provider connection status
 * 
 * @returns Connection status information
 */
export function useConnectionStatus() {
  const provider = useDataProvider()
  
  const isConnected = provider.state.connectionState === 'connected'
  const isConnecting = provider.state.connectionState === 'connecting'
  const hasError = provider.state.connectionState === 'error'
  const isDisconnected = provider.state.connectionState === 'disconnected'
  
  return {
    connectionState: provider.state.connectionState,
    isConnected,
    isConnecting,
    hasError,
    isDisconnected,
    lastSync: provider.state.lastSync
  }
}

/**
 * Hook for cache performance metrics
 * 
 * @returns Cache performance statistics
 */
export function useCacheMetrics() {
  const { cacheStats } = useData()
  
  const totalRequests = cacheStats.hits + cacheStats.misses
  const hitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0
  const missRate = totalRequests > 0 ? (cacheStats.misses / totalRequests) * 100 : 0
  
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    invalidations: cacheStats.invalidations,
    totalRequests,
    hitRate: Math.round(hitRate * 100) / 100,
    missRate: Math.round(missRate * 100) / 100
  }
}

/**
 * Hook for triggering data refresh operations
 * 
 * @returns Functions for refreshing different scopes of data
 */
export function useDataRefresh() {
  const provider = useDataProvider()
  
  const refreshAll = useCallback(async () => {
    await provider.refreshWorkspace()
  }, [provider])
  
  const refreshPath = useCallback(async (path: string) => {
    await provider.refreshPath(path)
  }, [provider])
  
  const refreshPattern = useCallback(async (pattern: RegExp) => {
    // This would require extending the provider to support pattern-based refresh
    console.warn('Pattern-based refresh not yet implemented')
  }, [])
  
  return {
    refreshAll,
    refreshPath,
    refreshPattern
  }
}