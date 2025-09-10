'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import type { DataHookState, ReadOptions } from './types'
import { 
  apiReadWithDefault, 
  dataCache, 
  parseApiError, 
  formatErrorMessage, 
  validatePath 
} from './utils'

/**
 * Options for useReadWithDefault hook
 */
interface ReadWithDefaultOptions<T> extends Omit<ReadOptions, 'defaultValue'> {
  /** Default value to use when data doesn't exist */
  defaultValue: T
  /** Whether to write the default value if no data exists (default: false) */
  initializeIfMissing?: boolean
  /** Validate the returned data against expected type/schema */
  validator?: (data: any) => data is T
  /** Transform the data after reading */
  transformer?: (data: any) => T
}

/**
 * Hook for reading data with a guaranteed default value
 * This hook ensures that data is never null/undefined by providing a fallback value
 * 
 * @param path - The hierarchical path to read from
 * @param options - Configuration options including the required defaultValue
 * @returns State object with data (never null), loading, error states and refresh function
 * 
 * @example
 * ```tsx
 * interface UserSettings {
 *   theme: 'light' | 'dark'
 *   notifications: boolean
 *   language: string
 * }
 * 
 * function SettingsComponent() {
 *   const { data, loading, error, refresh } = useReadWithDefault('/user/settings', {
 *     defaultValue: {
 *       theme: 'light',
 *       notifications: true,
 *       language: 'en'
 *     } as UserSettings,
 *     initializeIfMissing: true,
 *     validator: (data): data is UserSettings => {
 *       return typeof data === 'object' && 
 *              ['light', 'dark'].includes(data.theme) &&
 *              typeof data.notifications === 'boolean'
 *     }
 *   })
 *   
 *   if (loading) return <div>Loading settings...</div>
 *   if (error) return <div>Error: {error}</div>
 *   
 *   return (
 *     <div>
 *       <p>Theme: {data.theme}</p>
 *       <p>Notifications: {data.notifications ? 'On' : 'Off'}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useReadWithDefault<T = any>(
  path: string,
  options: ReadWithDefaultOptions<T>
): Omit<DataHookState<T>, 'data'> & {
  data: T
  refresh: () => Promise<void>
  cancel: () => void
  reset: () => Promise<void>
} {
  const { userId } = useAuth()
  const { organization } = useOrganization()
  
  const {
    defaultValue,
    initializeIfMissing = false,
    validator,
    transformer,
    cache = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    immediate = true,
    pollInterval
  } = options

  const [state, setState] = useState<Omit<DataHookState<T>, 'data'> & { data: T }>({
    data: defaultValue,
    loading: immediate,
    error: null,
    timestamp: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const initializedRef = useRef(false)

  // Get workspace ID from Clerk organization
  const workspaceId = organization?.id

  /**
   * Validate and transform data
   */
  const processData = useCallback((rawData: any): T => {
    // If data is null/undefined, use default
    if (rawData == null) {
      return defaultValue
    }

    // Apply validator if provided
    if (validator && !validator(rawData)) {
      console.warn(`Data validation failed for path ${path}, using default value`, rawData)
      return defaultValue
    }

    // Apply transformer if provided
    if (transformer) {
      try {
        return transformer(rawData)
      } catch (error) {
        console.warn(`Data transformation failed for path ${path}, using default value`, error)
        return defaultValue
      }
    }

    return rawData as T
  }, [defaultValue, validator, transformer, path])

  /**
   * Perform the read with default operation
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
        const processedData = processData(cachedEntry.data)
        setState(prev => ({
          ...prev,
          data: processedData,
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

      // Perform API call with default value
      const response = await apiReadWithDefault(
        workspaceId, 
        path, 
        defaultValue, 
        abortController.signal
      )

      // Check if component is still mounted
      if (!mountedRef.current) return

      const processedData = processData(response.data)

      // Check if we need to initialize missing data
      if (initializeIfMissing && 
          !initializedRef.current && 
          response.data == null && 
          processedData === defaultValue) {
        
        initializedRef.current = true
        
        // Write the default value to the server
        try {
          await fetch('/api/data/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              workspaceId,
              path,
              value: defaultValue
            })
          })
        } catch (writeError) {
          console.warn(`Failed to initialize default value for path ${path}`, writeError)
          // Continue anyway with the default value
        }
      }

      // Update cache if enabled
      if (cache) {
        dataCache.set(workspaceId, path, processedData)
      }

      // Update state
      setState(prev => ({
        ...prev,
        data: processedData,
        loading: false,
        error: null,
        timestamp: response.timestamp
      }))

    } catch (error: any) {
      // Check if component is still mounted and error wasn't from cancellation
      if (!mountedRef.current || error.name === 'AbortError') return

      const errorType = parseApiError(error)
      const errorMessage = formatErrorMessage(errorType)

      // On error, keep the default value as data
      setState(prev => ({
        ...prev,
        data: defaultValue,
        loading: false,
        error: errorMessage
      }))
    }
  }, [userId, workspaceId, path, defaultValue, initializeIfMissing, cache, cacheDuration, processData])

  /**
   * Refresh data (bypass cache)
   */
  const refresh = useCallback(async (): Promise<void> => {
    initializedRef.current = false
    await performRead(true)
  }, [performRead])

  /**
   * Reset to default value
   */
  const reset = useCallback(async (): Promise<void> => {
    if (!workspaceId) return

    try {
      setState(prev => ({ ...prev, loading: true }))
      
      await fetch('/api/data/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          path,
          value: defaultValue
        })
      })

      // Update cache and state
      if (cache) {
        dataCache.set(workspaceId, path, defaultValue)
      }

      setState(prev => ({
        ...prev,
        data: defaultValue,
        loading: false,
        error: null,
        timestamp: new Date().toISOString()
      }))

    } catch (error) {
      console.error(`Failed to reset path ${path} to default value`, error)
      setState(prev => ({
        ...prev,
        data: defaultValue,
        loading: false,
        error: 'Failed to reset to default value'
      }))
    }
  }, [workspaceId, path, defaultValue, cache])

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
    cancel,
    reset
  }
}