'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import type { WriteOptions } from './types'
import { 
  apiWrite, 
  dataCache, 
  parseApiError, 
  formatErrorMessage, 
  validatePath,
  getDescendantPaths
} from './utils'

/**
 * Write operation state
 */
interface WriteState {
  loading: boolean
  error: string | null
  lastWriteTimestamp: string | null
}

/**
 * Hook for writing data to the hierarchical data store
 * 
 * @param options - Configuration options for write operations
 * @returns Write function and state information
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { write, loading, error } = useWrite({
 *     optimistic: true,
 *     onSuccess: () => console.log('Data saved!'),
 *     onError: (error) => console.error('Failed to save:', error)
 *   })
 *   
 *   const handleSave = async () => {
 *     await write('/user/settings', { theme: 'dark' })
 *   }
 *   
 *   return (
 *     <button onClick={handleSave} disabled={loading}>
 *       {loading ? 'Saving...' : 'Save Settings'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useWrite(
  options: WriteOptions = {}
): WriteState & {
  write: (path: string, value: any) => Promise<boolean>
  cancel: () => void
} {
  const { userId } = useAuth()
  const { organization } = useOrganization()
  
  const {
    optimistic = true,
    invalidateCache = true,
    onSuccess,
    onError
  } = options

  const [state, setState] = useState<WriteState>({
    loading: false,
    error: null,
    lastWriteTimestamp: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Get workspace ID from Clerk organization
  const workspaceId = organization?.id

  /**
   * Write data to the specified path
   */
  const write = useCallback(async (path: string, value: any): Promise<boolean> => {
    // Validate prerequisites
    if (!userId) {
      const errorMessage = formatErrorMessage('AUTHENTICATION_REQUIRED')
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return false
    }

    if (!workspaceId) {
      const errorMessage = formatErrorMessage('WORKSPACE_ACCESS_DENIED')
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return false
    }

    if (!validatePath(path)) {
      const errorMessage = formatErrorMessage('INVALID_PATH')
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return false
    }

    // Store original cache value for rollback in case of optimistic update failure
    let originalCacheValue: any = null
    let hadOriginalValue = false

    try {
      // Set loading state
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Optimistic update to cache
      if (optimistic) {
        const existingEntry = dataCache.get(workspaceId, path)
        if (existingEntry) {
          originalCacheValue = existingEntry.data
          hadOriginalValue = true
        }
        
        // Update cache with new value immediately
        dataCache.set(workspaceId, path, value)
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Perform API call
      const response = await apiWrite(workspaceId, path, value, abortController.signal)

      // Update cache with confirmed value and invalidate related paths
      if (invalidateCache) {
        // Update the specific path
        dataCache.set(workspaceId, path, value)
        
        // Invalidate descendant paths that might be affected
        const descendantPaths = getDescendantPaths(workspaceId, path)
        descendantPaths.forEach(descendantPath => {
          if (descendantPath !== path) {
            dataCache.invalidate(workspaceId, descendantPath)
          }
        })
      }

      // Update state with success
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        lastWriteTimestamp: response.timestamp
      }))

      // Call success callback
      onSuccess?.(value)

      return true

    } catch (error: any) {
      // Handle cancellation
      if (error.name === 'AbortError') {
        return false
      }

      // Rollback optimistic update on failure
      if (optimistic) {
        if (hadOriginalValue) {
          dataCache.set(workspaceId, path, originalCacheValue)
        } else {
          dataCache.invalidate(workspaceId, path)
        }
      }

      const errorType = parseApiError(error)
      const errorMessage = formatErrorMessage(errorType)

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))

      // Call error callback
      onError?.(errorMessage)

      return false
    }
  }, [userId, workspaceId, optimistic, invalidateCache, onSuccess, onError])

  /**
   * Cancel any ongoing write operations
   */
  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  return {
    ...state,
    write,
    cancel
  }
}

/**
 * Convenience hook for writing to a specific path
 * 
 * @param path - The fixed path to write to
 * @param options - Configuration options for write operations
 * @returns Write function and state information for the specific path
 * 
 * @example
 * ```tsx
 * function UserSettings() {
 *   const { write, loading, error } = useWritePath('/user/settings')
 *   
 *   const updateTheme = async (theme: string) => {
 *     const currentSettings = await read('/user/settings') || {}
 *     await write({ ...currentSettings, theme })
 *   }
 *   
 *   return (
 *     <button onClick={() => updateTheme('dark')} disabled={loading}>
 *       Switch to Dark Theme
 *     </button>
 *   )
 * }
 * ```
 */
export function useWritePath(
  path: string,
  options: WriteOptions = {}
): WriteState & {
  write: (value: any) => Promise<boolean>
  cancel: () => void
} {
  const writeHook = useWrite(options)
  
  const writeToPath = useCallback(async (value: any): Promise<boolean> => {
    return writeHook.write(path, value)
  }, [writeHook.write, path])

  return {
    loading: writeHook.loading,
    error: writeHook.error,
    lastWriteTimestamp: writeHook.lastWriteTimestamp,
    write: writeToPath,
    cancel: writeHook.cancel
  }
}