'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import type { BatchOptions, HookBatchOperation } from './types'
import { 
  apiBatch, 
  dataCache, 
  parseApiError, 
  formatErrorMessage, 
  validatePath,
  getBatchCacheKey,
  getDescendantPaths
} from './utils'

/**
 * Batch operation state
 */
interface BatchState {
  loading: boolean
  error: string | null
  lastBatchTimestamp: string | null
}

/**
 * Batch result
 */
interface BatchResult {
  results: any[]
  operationCount: number
  timestamp: string
}

/**
 * Hook for executing multiple data operations atomically
 * All operations succeed or fail together as a single transaction
 * 
 * @param options - Configuration options for batch operations
 * @returns Batch execution function and state information
 * 
 * @example
 * ```tsx
 * function BatchOperations() {
 *   const { executeBatch, loading, error } = useBatch({
 *     optimistic: true,
 *     onSuccess: (results) => console.log('Batch completed:', results),
 *     onError: (error) => console.error('Batch failed:', error)
 *   })
 *   
 *   const handleBulkUpdate = async () => {
 *     const operations = [
 *       { type: 'write', path: '/user/name', value: 'John Doe' },
 *       { type: 'write', path: '/user/email', value: 'john@example.com' },
 *       { type: 'read', path: '/user/preferences', defaultValue: {} }
 *     ]
 *     
 *     const results = await executeBatch(operations)
 *     if (results) {
 *       console.log('All operations completed successfully')
 *     }
 *   }
 *   
 *   return (
 *     <button onClick={handleBulkUpdate} disabled={loading}>
 *       {loading ? 'Processing...' : 'Bulk Update'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useBatch(
  options: BatchOptions = {}
): BatchState & {
  executeBatch: (operations: HookBatchOperation[]) => Promise<BatchResult | null>
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

  const [state, setState] = useState<BatchState>({
    loading: false,
    error: null,
    lastBatchTimestamp: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  // Get workspace ID from Clerk organization
  const workspaceId = organization?.id

  /**
   * Execute a batch of operations atomically
   */
  const executeBatch = useCallback(async (
    operations: HookBatchOperation[]
  ): Promise<BatchResult | null> => {
    // Validate prerequisites
    if (!userId) {
      const errorMessage = formatErrorMessage('AUTHENTICATION_REQUIRED')
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return null
    }

    if (!workspaceId) {
      const errorMessage = formatErrorMessage('WORKSPACE_ACCESS_DENIED')
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return null
    }

    // Validate operations
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      const errorMessage = 'Operations array cannot be empty'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return null
    }

    if (operations.length > 25) {
      const errorMessage = 'Maximum 25 operations allowed per batch'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      return null
    }

    // Validate each operation
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      
      if (!op.type || !['read', 'write'].includes(op.type)) {
        const errorMessage = `Invalid operation type at index ${i}. Must be 'read' or 'write'.`
        setState(prev => ({ ...prev, error: errorMessage }))
        onError?.(errorMessage)
        return null
      }
      
      if (!validatePath(op.path)) {
        const errorMessage = `Invalid path at operation index ${i}`
        setState(prev => ({ ...prev, error: errorMessage }))
        onError?.(errorMessage)
        return null
      }
      
      if (op.type === 'write' && op.value === undefined) {
        const errorMessage = `Write operation at index ${i} must include 'value' parameter`
        setState(prev => ({ ...prev, error: errorMessage }))
        onError?.(errorMessage)
        return null
      }
    }

    // Store original cache values for rollback in case of optimistic update failure
    const originalCacheValues = new Map<string, { data: any; hadValue: boolean }>()

    try {
      // Set loading state
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Optimistic updates to cache
      if (optimistic) {
        operations.forEach(op => {
          if (op.type === 'write') {
            const existingEntry = dataCache.get(workspaceId, op.path)
            originalCacheValues.set(op.path, {
              data: existingEntry?.data,
              hadValue: !!existingEntry
            })
            
            // Update cache with new value immediately
            dataCache.set(workspaceId, op.path, op.value)
          }
        })
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Perform API call
      const response = await apiBatch(workspaceId, operations, abortController.signal)

      // Update cache with confirmed values and invalidate related paths
      if (invalidateCache) {
        operations.forEach((op, index) => {
          if (op.type === 'write') {
            // Update the specific path with the confirmed value
            dataCache.set(workspaceId, op.path, op.value)
            
            // Invalidate descendant paths that might be affected
            const descendantPaths = getDescendantPaths(workspaceId, op.path)
            descendantPaths.forEach(descendantPath => {
              if (descendantPath !== op.path) {
                dataCache.invalidate(workspaceId, descendantPath)
              }
            })
          } else if (op.type === 'read') {
            // Cache read results
            const result = response.results[index]
            const finalValue = result ?? op.defaultValue ?? null
            dataCache.set(workspaceId, op.path, finalValue)
          }
        })
      }

      // Update state with success
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        lastBatchTimestamp: response.timestamp
      }))

      // Call success callback
      onSuccess?.(response.results)

      return response

    } catch (error: any) {
      // Handle cancellation
      if (error.name === 'AbortError') {
        return null
      }

      // Rollback optimistic updates on failure
      if (optimistic) {
        originalCacheValues.forEach((originalValue, path) => {
          if (originalValue.hadValue) {
            dataCache.set(workspaceId, path, originalValue.data)
          } else {
            dataCache.invalidate(workspaceId, path)
          }
        })
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

      return null
    }
  }, [userId, workspaceId, optimistic, invalidateCache, onSuccess, onError])

  /**
   * Cancel any ongoing batch operations
   */
  const cancel = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  return {
    ...state,
    executeBatch,
    cancel
  }
}

/**
 * Convenience hook for creating and executing batches with a builder pattern
 * 
 * @example
 * ```tsx
 * function BatchBuilder() {
 *   const { batch, loading, error } = useBatchBuilder()
 *   
 *   const handleComplexUpdate = async () => {
 *     const result = await batch()
 *       .read('/config/settings')
 *       .write('/user/lastLogin', new Date().toISOString())
 *       .write('/user/loginCount', (prev) => (prev || 0) + 1)
 *       .readWithDefault('/user/preferences', { theme: 'light' })
 *       .execute()
 *       
 *     if (result) {
 *       console.log('Complex update completed')
 *     }
 *   }
 *   
 *   return (
 *     <button onClick={handleComplexUpdate} disabled={loading}>
 *       Complex Update
 *     </button>
 *   )
 * }
 * ```
 */
export function useBatchBuilder(options: BatchOptions = {}) {
  const batchHook = useBatch(options)
  
  const createBatch = useCallback(() => {
    const operations: HookBatchOperation[] = []
    
    const builder = {
      read: (path: string) => {
        operations.push({ type: 'read', path })
        return builder
      },
      
      readWithDefault: (path: string, defaultValue: any) => {
        operations.push({ type: 'read', path, defaultValue })
        return builder
      },
      
      write: (path: string, value: any) => {
        operations.push({ type: 'write', path, value })
        return builder
      },
      
      execute: () => {
        return batchHook.executeBatch([...operations])
      }
    }
    
    return builder
  }, [batchHook.executeBatch])
  
  return {
    loading: batchHook.loading,
    error: batchHook.error,
    lastBatchTimestamp: batchHook.lastBatchTimestamp,
    batch: createBatch,
    cancel: batchHook.cancel
  }
}