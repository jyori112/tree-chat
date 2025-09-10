'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import type { DataHookState, ReadOptions, TreeNode } from './types'
import { 
  apiReadTree, 
  dataCache, 
  parseApiError, 
  formatErrorMessage, 
  validatePath 
} from './utils'

/**
 * Tree data hook state
 */
interface TreeDataState extends Omit<DataHookState<TreeNode[]>, 'data'> {
  tree: TreeNode[]
}

/**
 * Tree read options
 */
interface TreeReadOptions extends Omit<ReadOptions, 'defaultValue'> {
  /** Default tree structure to return if no data exists */
  defaultTree?: TreeNode[]
  /** Maximum depth to read (optional) */
  maxDepth?: number
  /** Include empty nodes in the tree (default: false) */
  includeEmpty?: boolean
}

/**
 * Hook for reading tree data from the hierarchical data store
 * 
 * @param path - The hierarchical path to read the tree from (e.g., '/project/tasks')
 * @param options - Configuration options for the tree read operation
 * @returns State object with tree data, loading, error states and refresh function
 * 
 * @example
 * ```tsx
 * function TreeView() {
 *   const { tree, loading, error, refresh } = useReadTree('/project', {
 *     maxDepth: 3,
 *     includeEmpty: false,
 *     pollInterval: 60000 // Poll every minute
 *   })
 *   
 *   if (loading) return <div>Loading tree...</div>
 *   if (error) return <div>Error: {error}</div>
 *   
 *   return (
 *     <div>
 *       {tree.map(node => (
 *         <TreeNodeComponent key={node.path} node={node} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useReadTree(
  path: string,
  options: TreeReadOptions = {}
): TreeDataState & {
  refresh: () => Promise<void>
  cancel: () => void
  findNode: (nodePath: string) => TreeNode | null
  getNodeValue: (nodePath: string) => any
} {
  const { userId } = useAuth()
  const { organization } = useOrganization()
  
  const {
    defaultTree = [],
    cache = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes
    immediate = true,
    pollInterval,
    maxDepth,
    includeEmpty = false
  } = options

  const [state, setState] = useState<TreeDataState>({
    tree: defaultTree,
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
   * Generate cache key for tree data
   */
  const getCacheKey = useCallback((treePath: string): string => {
    const params = [
      maxDepth ? `depth:${maxDepth}` : '',
      includeEmpty ? 'includeEmpty' : ''
    ].filter(Boolean).join(',')
    
    return params ? `tree:${treePath}:${params}` : `tree:${treePath}`
  }, [maxDepth, includeEmpty])

  /**
   * Perform the tree read operation
   */
  const performReadTree = useCallback(async (skipCache = false): Promise<void> => {
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
      const cacheKey = getCacheKey(path)
      const cachedEntry = dataCache.get<TreeNode[]>(workspaceId, cacheKey)
      if (cachedEntry && Date.now() - cachedEntry.timestamp < cacheDuration) {
        setState(prev => ({
          ...prev,
          tree: cachedEntry.data,
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
      const response = await apiReadTree(workspaceId, path, abortController.signal)

      // Check if component is still mounted
      if (!mountedRef.current) return

      let tree = response.tree ?? defaultTree

      // Apply filters if specified
      if (maxDepth !== undefined || !includeEmpty) {
        tree = filterTree(tree, { maxDepth, includeEmpty })
      }

      // Update cache if enabled
      if (cache) {
        const cacheKey = getCacheKey(path)
        dataCache.set(workspaceId, cacheKey, tree)
      }

      // Update state
      setState(prev => ({
        ...prev,
        tree,
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
  }, [userId, workspaceId, path, defaultTree, cache, cacheDuration, getCacheKey, maxDepth, includeEmpty])

  /**
   * Refresh tree data (bypass cache)
   */
  const refresh = useCallback(async (): Promise<void> => {
    await performReadTree(true)
  }, [performReadTree])

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

  /**
   * Find a specific node in the tree by path
   */
  const findNode = useCallback((nodePath: string): TreeNode | null => {
    return findNodeInTree(state.tree, nodePath)
  }, [state.tree])

  /**
   * Get value of a specific node by path
   */
  const getNodeValue = useCallback((nodePath: string): any => {
    const node = findNode(nodePath)
    return node?.value ?? null
  }, [findNode])

  // Initial load effect
  useEffect(() => {
    if (immediate) {
      performReadTree()
    }
  }, [immediate, performReadTree])

  // Polling effect
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      pollIntervalRef.current = setInterval(() => {
        performReadTree()
      }, pollInterval)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
  }, [pollInterval, performReadTree])

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
    findNode,
    getNodeValue
  }
}

/**
 * Filter tree based on options
 */
function filterTree(
  tree: TreeNode[], 
  options: { maxDepth?: number; includeEmpty?: boolean }
): TreeNode[] {
  const { maxDepth, includeEmpty } = options
  
  function filterNode(node: TreeNode, currentDepth: number): TreeNode | null {
    // Check depth limit
    if (maxDepth !== undefined && currentDepth > maxDepth) {
      return null
    }
    
    // Check if we should include empty nodes
    if (!includeEmpty && (node.value === null || node.value === undefined)) {
      // Only include if it has children that would be included
      if (!node.children || node.children.length === 0) {
        return null
      }
    }
    
    // Recursively filter children
    let filteredChildren: TreeNode[] = []
    if (node.children) {
      filteredChildren = node.children
        .map(child => filterNode(child, currentDepth + 1))
        .filter((child): child is TreeNode => child !== null)
    }
    
    // If we're excluding empty nodes and this node is empty with no valid children, exclude it
    if (!includeEmpty && 
        (node.value === null || node.value === undefined) && 
        filteredChildren.length === 0) {
      return null
    }
    
    return {
      ...node,
      children: filteredChildren.length > 0 ? filteredChildren : undefined
    }
  }
  
  return tree
    .map(node => filterNode(node, 0))
    .filter((node): node is TreeNode => node !== null)
}

/**
 * Find a node in the tree by path
 */
function findNodeInTree(tree: TreeNode[], targetPath: string): TreeNode | null {
  for (const node of tree) {
    if (node.path === targetPath) {
      return node
    }
    
    if (node.children) {
      const found = findNodeInTree(node.children, targetPath)
      if (found) return found
    }
  }
  
  return null
}