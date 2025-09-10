/**
 * Data Infrastructure React Hooks
 * 
 * This module provides React hooks for interacting with the hierarchical data store.
 * All hooks integrate with Clerk authentication and provide proper state management,
 * caching, error handling, and optimistic updates.
 * 
 * @example
 * ```tsx
 * import { useRead, useWrite, useBatch } from '@/hooks/data'
 * 
 * function MyComponent() {
 *   const { data, loading, error } = useRead('/user/settings')
 *   const { write } = useWrite()
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   
 *   return <div>{JSON.stringify(data)}</div>
 * }
 * ```
 */

// Core hooks
export { useRead } from './useRead'
export { useWrite, useWritePath } from './useWrite'
export { useReadWithDefault } from './useReadWithDefault'
export { useReadTree } from './useReadTree'
export { useBatch, useBatchBuilder } from './useBatch'

// Import hooks for internal use
import { useRead } from './useRead'
import { useWritePath } from './useWrite'

// Types and interfaces
export type {
  DataHookState,
  ReadOptions,
  WriteOptions,
  BatchOptions,
  TreeNode,
  CacheEntry,
  CacheManager,
  DataHookError,
  HookBatchOperation,
  ReadResponse,
  WriteResponse,
  BatchResponse,
  TreeResponse
} from './types'

// Utilities (exported for advanced use cases)
export {
  dataCache,
  parseApiError,
  formatErrorMessage,
  validatePath,
  apiRead,
  apiWrite,
  apiReadWithDefault,
  apiReadTree,
  apiBatch,
  debounce,
  getBatchCacheKey,
  isAncestorPath,
  getDescendantPaths
} from './utils'

/**
 * Hook combinations for common patterns
 */

/**
 * Combined read/write hook for a specific path
 * Provides both reading and writing capabilities for a single data path
 * 
 * @param path - The hierarchical path to operate on
 * @param options - Combined options for read and write operations
 * @returns Combined state and operations
 * 
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data, loading, error, update, refresh } = useReadWrite('/user/profile', {
 *     defaultValue: { name: '', email: '' },
 *     optimistic: true
 *   })
 *   
 *   const handleNameChange = (name: string) => {
 *     update({ ...data, name })
 *   }
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={data.name} 
 *         onChange={(e) => handleNameChange(e.target.value)} 
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
export function useReadWrite<T = any>(
  path: string,
  options: {
    defaultValue?: T
    optimistic?: boolean
    cache?: boolean
    cacheDuration?: number
    immediate?: boolean
    pollInterval?: number
    onSuccess?: (data: T) => void
    onError?: (error: string) => void
  } = {}
) {
  const { defaultValue, optimistic, cache, cacheDuration, immediate, pollInterval, onSuccess, onError } = options
  
  const readHook = useRead<T>(path, {
    defaultValue,
    cache,
    cacheDuration,
    immediate,
    pollInterval
  })
  
  const writeHook = useWritePath(path, {
    optimistic,
    onSuccess,
    onError
  })
  
  return {
    // Read state
    data: readHook.data,
    loading: readHook.loading || writeHook.loading,
    error: readHook.error || writeHook.error,
    timestamp: readHook.timestamp,
    
    // Operations
    update: writeHook.write,
    refresh: readHook.refresh,
    cancel: () => {
      readHook.cancel()
      writeHook.cancel()
    }
  }
}

/**
 * Hook for managing a list/array at a specific path
 * Provides convenient methods for array operations
 * 
 * @param path - The hierarchical path containing the array
 * @param options - Configuration options
 * @returns Array state and manipulation methods
 * 
 * @example
 * ```tsx
 * function TodoList() {
 *   const { items, loading, error, append, remove, update } = useArray('/todos', {
 *     defaultValue: []
 *   })
 *   
 *   const addTodo = (text: string) => {
 *     append({ id: Date.now(), text, done: false })
 *   }
 *   
 *   const toggleTodo = (id: number) => {
 *     update(id, (todo) => ({ ...todo, done: !todo.done }))
 *   }
 *   
 *   return (
 *     <div>
 *       {items.map(todo => (
 *         <div key={todo.id}>
 *           <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
 *           <button onClick={() => remove(todo.id)}>Delete</button>
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useArray<T = any>(
  path: string,
  options: {
    defaultValue?: T[]
    optimistic?: boolean
    cache?: boolean
    immediate?: boolean
  } = {}
) {
  const { defaultValue = [], optimistic = true, cache = true, immediate = true } = options
  
  const readWriteHook = useReadWrite<T[]>(path, {
    defaultValue,
    optimistic,
    cache,
    immediate
  })
  
  const append = async (item: T): Promise<boolean> => {
    const currentItems = readWriteHook.data || []
    return await readWriteHook.update([...currentItems, item])
  }
  
  const prepend = async (item: T): Promise<boolean> => {
    const currentItems = readWriteHook.data || []
    return await readWriteHook.update([item, ...currentItems])
  }
  
  const remove = async (predicate: (item: T, index: number) => boolean): Promise<boolean> => {
    const currentItems = readWriteHook.data || []
    const filteredItems = currentItems.filter((item: T, index: number) => !predicate(item, index))
    return await readWriteHook.update(filteredItems)
  }
  
  const update = async (predicate: (item: T, index: number) => boolean, updater: (item: T) => T): Promise<boolean> => {
    const currentItems = readWriteHook.data || []
    const updatedItems = currentItems.map((item: T, index: number) => 
      predicate(item, index) ? updater(item) : item
    )
    return await readWriteHook.update(updatedItems)
  }
  
  const clear = async (): Promise<boolean> => {
    return await readWriteHook.update([])
  }
  
  return {
    items: readWriteHook.data || [],
    loading: readWriteHook.loading,
    error: readWriteHook.error,
    timestamp: readWriteHook.timestamp,
    append,
    prepend,
    remove,
    update,
    clear,
    refresh: readWriteHook.refresh,
    cancel: readWriteHook.cancel
  }
}

/**
 * Hook for managing an object/map at a specific path
 * Provides convenient methods for object property operations
 * 
 * @param path - The hierarchical path containing the object
 * @param options - Configuration options
 * @returns Object state and manipulation methods
 * 
 * @example
 * ```tsx
 * function Settings() {
 *   const { data, loading, error, setProperty, deleteProperty } = useObject('/user/settings', {
 *     defaultValue: { theme: 'light', notifications: true }
 *   })
 *   
 *   const toggleTheme = () => {
 *     setProperty('theme', data.theme === 'light' ? 'dark' : 'light')
 *   }
 *   
 *   return (
 *     <div>
 *       <button onClick={toggleTheme}>
 *         Current theme: {data.theme}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useObject<T extends Record<string, any> = Record<string, any>>(
  path: string,
  options: {
    defaultValue?: T
    optimistic?: boolean
    cache?: boolean
    immediate?: boolean
  } = {}
) {
  const { defaultValue = {} as T, optimistic = true, cache = true, immediate = true } = options
  
  const readWriteHook = useReadWrite<T>(path, {
    defaultValue,
    optimistic,
    cache,
    immediate
  })
  
  const setProperty = async <K extends keyof T>(key: K, value: T[K]): Promise<boolean> => {
    const currentData = readWriteHook.data || defaultValue
    return await readWriteHook.update({ ...currentData, [key]: value })
  }
  
  const setProperties = async (updates: Partial<T>): Promise<boolean> => {
    const currentData = readWriteHook.data || defaultValue
    return await readWriteHook.update({ ...currentData, ...updates })
  }
  
  const deleteProperty = async <K extends keyof T>(key: K): Promise<boolean> => {
    const currentData = readWriteHook.data || defaultValue
    const { [key]: deleted, ...rest } = currentData
    return await readWriteHook.update(rest as T)
  }
  
  const clear = async (): Promise<boolean> => {
    return await readWriteHook.update(defaultValue)
  }
  
  return {
    data: readWriteHook.data || defaultValue,
    loading: readWriteHook.loading,
    error: readWriteHook.error,
    timestamp: readWriteHook.timestamp,
    setProperty,
    setProperties,
    deleteProperty,
    clear,
    refresh: readWriteHook.refresh,
    cancel: readWriteHook.cancel
  }
}