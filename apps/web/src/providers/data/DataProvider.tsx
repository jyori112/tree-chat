'use client'

/**
 * DataProvider Component
 * 
 * Centralized data management provider that handles:
 * - Workspace-level data isolation
 * - Cache management and synchronization
 * - Authentication state integration
 * - Real-time data synchronization
 * - Optimistic updates and rollback
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { useUser, useOrganization } from '@clerk/nextjs'
import type { 
  DataProviderState, 
  DataProviderContextValue, 
  DataProviderProps, 
  DataProviderConfig,
  WorkspaceContext,
  OptimisticUpdate,
  SyncEvent,
  SyncEventType
} from './types'
import { dataCache } from '@/hooks/data/utils'
import { generateId } from './utils'
import { SyncManager, type ConnectionState } from './SyncManager'

// Default configuration
const defaultConfig: DataProviderConfig = {
  cache: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    cleanupInterval: 60 * 1000 // 1 minute
  },
  sync: {
    enabled: false, // Disabled by default, can be enabled later
    maxRetries: 3,
    retryDelay: 1000,
    heartbeatInterval: 30000
  },
  debug: false
}

// Initial state
const initialState: DataProviderState = {
  workspace: {
    workspaceId: null,
    userId: null,
    organizationId: null,
    isPersonal: true
  },
  isAuthenticated: false,
  user: null,
  connectionState: 'disconnected',
  optimisticUpdates: new Map(),
  isLoading: false,
  error: null,
  lastSync: null,
  cacheStats: {
    hits: 0,
    misses: 0,
    invalidations: 0
  }
}

// Action types for state management
type DataProviderAction = 
  | { type: 'SET_WORKSPACE'; payload: WorkspaceContext }
  | { type: 'SET_USER'; payload: { user: any; isAuthenticated: boolean } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATE'; payload: 'disconnected' | 'connecting' | 'connected' | 'error' }
  | { type: 'ADD_OPTIMISTIC_UPDATE'; payload: OptimisticUpdate }
  | { type: 'REMOVE_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'UPDATE_CACHE_STATS'; payload: Partial<{ hits: number; misses: number; invalidations: number }> }
  | { type: 'SET_LAST_SYNC'; payload: string }
  | { type: 'RESET_STATE' }

// State reducer
function dataProviderReducer(state: DataProviderState, action: DataProviderAction): DataProviderState {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { ...state, workspace: action.payload }
    
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload.user, 
        isAuthenticated: action.payload.isAuthenticated 
      }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload }
    
    case 'ADD_OPTIMISTIC_UPDATE':
      const newUpdates = new Map(state.optimisticUpdates)
      newUpdates.set(action.payload.id, action.payload)
      return { ...state, optimisticUpdates: newUpdates }
    
    case 'REMOVE_OPTIMISTIC_UPDATE':
      const updatedUpdates = new Map(state.optimisticUpdates)
      updatedUpdates.delete(action.payload)
      return { ...state, optimisticUpdates: updatedUpdates }
    
    case 'UPDATE_CACHE_STATS':
      return { 
        ...state, 
        cacheStats: { ...state.cacheStats, ...action.payload } 
      }
    
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload }
    
    case 'RESET_STATE':
      return { ...initialState }
    
    default:
      return state
  }
}

// Create context
const DataProviderContext = createContext<DataProviderContextValue | null>(null)

// Provider component
export function DataProvider({ 
  children, 
  config: userConfig,
  initialWorkspaceId,
  debug = false 
}: DataProviderProps) {
  const config = { ...defaultConfig, ...userConfig, debug }
  const [state, dispatch] = useReducer(dataProviderReducer, initialState)
  
  // Clerk hooks for authentication
  const { user, isLoaded: userLoaded } = useUser()
  const { organization } = useOrganization()
  
  // Refs for event listeners and intervals
  const eventListenersRef = useRef<{
    syncEvents: Set<(event: SyncEvent) => void>
    workspaceChange: Set<(workspace: WorkspaceContext) => void>
    authChange: Set<(user: any) => void>
  }>({
    syncEvents: new Set(),
    workspaceChange: new Set(), 
    authChange: new Set()
  })
  
  const syncManagerRef = useRef<SyncManager | null>(null)
  const cacheCleanupRef = useRef<NodeJS.Timeout | null>(null)

  // Logging utility
  const log = useCallback((...args: any[]) => {
    if (config.debug) {
      console.log('[DataProvider]', ...args)
    }
  }, [config.debug])

  // Initialize sync manager
  useEffect(() => {
    if (!syncManagerRef.current) {
      syncManagerRef.current = new SyncManager(config.sync, {
        onConnectionStateChange: (connectionState) => {
          dispatch({ type: 'SET_CONNECTION_STATE', payload: connectionState })
        },
        onSyncEvent: (event) => {
          log('Sync event received:', event)
          
          // Handle data updates from other clients
          if (event.type === 'data_updated' && event.path && state.workspace.workspaceId) {
            dataCache.invalidate(state.workspace.workspaceId, event.path)
            dispatch({ type: 'UPDATE_CACHE_STATS', payload: { invalidations: state.cacheStats.invalidations + 1 } })
          }
          
          // Notify sync event listeners
          eventListenersRef.current.syncEvents.forEach(callback => {
            callback(event)
          })
        },
        onError: (error) => {
          dispatch({ type: 'SET_ERROR', payload: error })
          log('Sync error:', error)
        },
        onSync: (timestamp) => {
          dispatch({ type: 'SET_LAST_SYNC', payload: timestamp })
          log('Sync completed at:', timestamp)
        }
      })
    }
  }, [config.sync, log])

  // Update sync manager workspace when workspace changes
  useEffect(() => {
    if (syncManagerRef.current && state.workspace.workspaceId) {
      syncManagerRef.current.updateWorkspace(state.workspace)
    }
  }, [state.workspace])

  // Update workspace context when user or organization changes
  useEffect(() => {
    if (!userLoaded) return

    const newWorkspace: WorkspaceContext = {
      workspaceId: organization?.id || user?.id || null,
      userId: user?.id || null,
      organizationId: organization?.id || null,
      isPersonal: !organization?.id
    }

    // Only update if workspace actually changed
    if (JSON.stringify(newWorkspace) !== JSON.stringify(state.workspace)) {
      log('Workspace changed:', newWorkspace)
      dispatch({ type: 'SET_WORKSPACE', payload: newWorkspace })
      
      // Clear cache for previous workspace
      if (state.workspace.workspaceId && state.workspace.workspaceId !== newWorkspace.workspaceId) {
        dataCache.invalidate(state.workspace.workspaceId)
        log('Cleared cache for previous workspace:', state.workspace.workspaceId)
      }

      // Notify workspace change listeners
      eventListenersRef.current.workspaceChange.forEach(callback => {
        callback(newWorkspace)
      })
    }

    // Update authentication state
    const authChanged = state.user?.id !== user?.id
    dispatch({ 
      type: 'SET_USER', 
      payload: { user, isAuthenticated: !!user }
    })

    if (authChanged) {
      // Notify auth change listeners
      eventListenersRef.current.authChange.forEach(callback => {
        callback(user)
      })
    }
  }, [user, userLoaded, organization, state.workspace, state.user, log])

  // Set initial workspace if provided
  useEffect(() => {
    if (initialWorkspaceId && userLoaded && !state.workspace.workspaceId) {
      const workspace: WorkspaceContext = {
        workspaceId: initialWorkspaceId,
        userId: user?.id || null,
        organizationId: organization?.id || null,
        isPersonal: !organization?.id
      }
      dispatch({ type: 'SET_WORKSPACE', payload: workspace })
    }
  }, [initialWorkspaceId, userLoaded, user, organization, state.workspace.workspaceId])

  // Setup cache cleanup interval
  useEffect(() => {
    if (!config.cache.enabled) return

    cacheCleanupRef.current = setInterval(() => {
      // Cache cleanup is handled internally by the cache implementation
      log('Cache cleanup interval triggered')
    }, config.cache.cleanupInterval)

    return () => {
      if (cacheCleanupRef.current) {
        clearInterval(cacheCleanupRef.current)
      }
    }
  }, [config.cache.enabled, config.cache.cleanupInterval, log])

  // Cache operations
  const getCacheStats = useCallback(() => {
    return state.cacheStats
  }, [state.cacheStats])

  const clearCache = useCallback((workspaceId?: string) => {
    const targetWorkspaceId = workspaceId || state.workspace.workspaceId
    if (targetWorkspaceId) {
      dataCache.invalidate(targetWorkspaceId)
      dispatch({ type: 'UPDATE_CACHE_STATS', payload: { invalidations: state.cacheStats.invalidations + 1 } })
      log('Cache cleared for workspace:', targetWorkspaceId)
    }
  }, [state.workspace.workspaceId, state.cacheStats.invalidations, log])

  // Workspace operations
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })
    
    try {
      log('Switching to workspace:', workspaceId)
      
      // Clear cache for current workspace
      if (state.workspace.workspaceId) {
        dataCache.invalidate(state.workspace.workspaceId)
      }
      
      const newWorkspace: WorkspaceContext = {
        workspaceId,
        userId: user?.id || null,
        organizationId: organization?.id || null,
        isPersonal: workspaceId === user?.id
      }
      
      dispatch({ type: 'SET_WORKSPACE', payload: newWorkspace })
      
      // Notify listeners
      eventListenersRef.current.workspaceChange.forEach(callback => {
        callback(newWorkspace)
      })
      
      log('Workspace switched successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch workspace'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      log('Error switching workspace:', errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.workspace.workspaceId, user?.id, organization?.id, log])

  const refreshWorkspace = useCallback(async () => {
    if (!state.workspace.workspaceId) return
    
    log('Refreshing workspace data')
    clearCache(state.workspace.workspaceId)
    
    // Trigger re-fetch for all cached data
    dispatch({ type: 'UPDATE_CACHE_STATS', payload: { invalidations: state.cacheStats.invalidations + 1 } })
  }, [state.workspace.workspaceId, state.cacheStats.invalidations, clearCache, log])

  // Optimistic updates
  const addOptimisticUpdate = useCallback((
    update: Omit<OptimisticUpdate<any>, 'id' | 'timestamp' | 'rollback'>
  ): string => {
    const id = generateId()
    const optimisticUpdate: OptimisticUpdate<any> = {
      id,
      timestamp: Date.now(),
      rollback: async () => {
        // Rollback implementation - restore previous value
        if (update.previousValue !== null && state.workspace.workspaceId) {
          dataCache.set(state.workspace.workspaceId, update.path, update.previousValue)
        }
      },
      ...update
    }
    
    dispatch({ type: 'ADD_OPTIMISTIC_UPDATE', payload: optimisticUpdate })
    log('Added optimistic update:', id, update.path)
    
    return id
  }, [state.workspace.workspaceId, log])

  const removeOptimisticUpdate = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: id })
    log('Removed optimistic update:', id)
  }, [log])

  const rollbackOptimisticUpdate = useCallback(async (id: string): Promise<boolean> => {
    const update = state.optimisticUpdates.get(id)
    if (!update) return false
    
    try {
      await update.rollback()
      removeOptimisticUpdate(id)
      log('Rolled back optimistic update:', id)
      return true
    } catch (error) {
      log('Failed to rollback optimistic update:', id, error)
      return false
    }
  }, [state.optimisticUpdates, removeOptimisticUpdate, log])

  const rollbackAllOptimisticUpdates = useCallback(async () => {
    const updateIds = Array.from(state.optimisticUpdates.keys())
    log('Rolling back all optimistic updates:', updateIds.length)
    
    for (const id of updateIds) {
      await rollbackOptimisticUpdate(id)
    }
  }, [state.optimisticUpdates, rollbackOptimisticUpdate, log])

  // Real-time sync operations
  const enableSync = useCallback(async () => {
    if (syncManagerRef.current && state.workspace.workspaceId) {
      try {
        await syncManagerRef.current.connect(state.workspace)
        log('Real-time sync enabled')
      } catch (error) {
        log('Failed to enable sync:', error)
      }
    }
  }, [state.workspace, log])

  const disableSync = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.disconnect()
      log('Real-time sync disabled')
    }
  }, [log])

  const forceSync = useCallback(async () => {
    if (syncManagerRef.current) {
      syncManagerRef.current.forceSync()
      log('Force sync triggered')
    }
  }, [log])

  // Data invalidation
  const invalidatePath = useCallback((path: string, propagate = true) => {
    if (state.workspace.workspaceId) {
      dataCache.invalidate(state.workspace.workspaceId, path)
      dispatch({ type: 'UPDATE_CACHE_STATS', payload: { invalidations: state.cacheStats.invalidations + 1 } })
      log('Invalidated path:', path)
    }
  }, [state.workspace.workspaceId, state.cacheStats.invalidations, log])

  const invalidatePattern = useCallback((pattern: RegExp, propagate = true) => {
    // Implementation for pattern-based invalidation
    log('Invalidating pattern:', pattern)
    // This would require extending the cache manager to support pattern matching
  }, [log])

  const refreshPath = useCallback(async (path: string) => {
    invalidatePath(path)
    log('Refreshing path:', path)
    // The next read for this path will fetch fresh data
  }, [invalidatePath, log])

  // Event subscriptions
  const onSyncEvent = useCallback((callback: (event: SyncEvent) => void) => {
    eventListenersRef.current.syncEvents.add(callback)
    return () => {
      eventListenersRef.current.syncEvents.delete(callback)
    }
  }, [])

  const onWorkspaceChange = useCallback((callback: (workspace: WorkspaceContext) => void) => {
    eventListenersRef.current.workspaceChange.add(callback)
    return () => {
      eventListenersRef.current.workspaceChange.delete(callback)
    }
  }, [])

  const onAuthChange = useCallback((callback: (user: any) => void) => {
    eventListenersRef.current.authChange.add(callback)
    return () => {
      eventListenersRef.current.authChange.delete(callback)
    }
  }, [])

  // Debug utilities
  const getProviderState = useCallback(() => {
    return state
  }, [state])

  const exportCache = useCallback(() => {
    // Export cache data for debugging
    return {}
  }, [])

  const importCache = useCallback((data: Record<string, any>) => {
    // Import cache data for debugging
    log('Importing cache data:', Object.keys(data).length, 'entries')
  }, [log])

  // Context value
  const contextValue: DataProviderContextValue = {
    state,
    cache: dataCache,
    getCacheStats,
    clearCache,
    switchWorkspace,
    refreshWorkspace,
    addOptimisticUpdate,
    removeOptimisticUpdate,
    rollbackOptimisticUpdate,
    rollbackAllOptimisticUpdates,
    enableSync,
    disableSync,
    forcSync: forceSync,
    invalidatePath,
    invalidatePattern,
    refreshPath,
    onSyncEvent,
    onWorkspaceChange,
    onAuthChange,
    getProviderState,
    exportCache,
    importCache
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncManagerRef.current) {
        syncManagerRef.current.destroy()
      }
      if (cacheCleanupRef.current) {
        clearInterval(cacheCleanupRef.current)
      }
    }
  }, [])

  return (
    <DataProviderContext.Provider value={contextValue}>
      {children}
    </DataProviderContext.Provider>
  )
}

// Hook to access data provider
export function useDataProvider(): DataProviderContextValue {
  const context = useContext(DataProviderContext)
  if (!context) {
    throw new Error('useDataProvider must be used within a DataProvider')
  }
  return context
}

// Export context for advanced usage
export { DataProviderContext }