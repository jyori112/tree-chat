'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import type { DataHookState, ReadOptions } from './types'
import { 
  apiRead, 
  dataCache, 
  parseApiError, 
  formatErrorMessage, 
  validatePath 
} from './utils'

/**
 * Hook for reading data from the hierarchical data store
 * 
 * @param path - The hierarchical path to read from (e.g., '/user/preferences')
 * @param options - Configuration options for the read operation
 * @returns State object with data, loading, error states and refresh function
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, loading, error, refresh } = useRead('/user/settings', {
 *     defaultValue: { theme: 'light' },
 *     pollInterval: 30000 // Poll every 30 seconds
 *   })
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   
 *   return <div>{JSON.stringify(data)}</div>
 * }
 * ```
 */
export function useRead<T = any>(
  path: string,
  options: ReadOptions = {}
): DataHookState<T> & {
  refresh: () => Promise<void>
  cancel: () => void
} {
  const { userId } = useAuth()
  const { organization } = useOrganization()
  
  const {
    defaultValue = null,
    cache = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    immediate = true,
    pollInterval
  } = options

  const [state, setState] = useState<DataHookState<T>>({
    data: defaultValue,
    loading: immediate,
    error: null,
    timestamp: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Get workspace ID from Clerk organization
  const workspaceId = organization?.id

  /**
   * Perform the read operation
   */
  const performRead = useCallback(async (skipCache = false): Promise<void> => {
    // Validate prerequisites
    if (!userId) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: formatErrorMessage('AUTHENTICATION_REQUIRED')
      }))
      return
    }

    if (!workspaceId) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: formatErrorMessage('WORKSPACE_ACCESS_DENIED')
      }))
      return
    }

    if (!validatePath(path)) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: formatErrorMessage('INVALID_PATH')
      }))
      return
    }

    // Check cache first if enabled and not skipping
    if (cache && !skipCache) {
      const cachedEntry = dataCache.get<T>(workspaceId, path)
      if (cachedEntry && Date.now() - cachedEntry.timestamp < cacheDuration) {
        setState(prev => ({
          ...prev,
          data: cachedEntry.data,
          loading: false,
          error: null,
          timestamp: new Date(cachedEntry.timestamp).toISOString()
        }))
        return
      }
    }

    // Set loading state
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Perform API call
      const response = await apiRead(workspaceId, path, abortController.signal)

      // Check if component is still mounted
      if (!mountedRef.current) return

      const data = response.data ?? defaultValue

      // Update cache if enabled
      if (cache) {
        dataCache.set(workspaceId, path, data)
      }

      // Update state
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        timestamp: response.timestamp
      }))

    } catch (error: any) {
      // Check if component is still mounted and error wasn't from cancellation
      if (!mountedRef.current || error.name === 'AbortError') return

      const errorType = parseApiError(error)
      const errorMessage = formatErrorMessage(errorType)

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
    }
  }, [userId, workspaceId, path, defaultValue, cache, cacheDuration])

  /**
   * Refresh data (bypass cache)
   */
  const refresh = useCallback(async (): Promise<void> => {
    await performRead(true)
  }, [performRead])

  /**
   * Cancel any ongoing requests
   */
  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Initial load effect
  useEffect(() => {
    if (immediate) {
      performRead()
    }
  }, [immediate, performRead])

  // Polling effect
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        performRead()
      }, pollInterval)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
  }, [pollInterval, performRead])

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false
      cancel()
    }
  }, [cancel])

  return {
    ...state,
    refresh,
    cancel
  }
}