/**
 * Data Provider Utilities
 * 
 * Utility functions for the data provider system
 */

/**
 * Generate a unique ID for optimistic updates
 */
export function generateId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate workspace ID format
 */
export function isValidWorkspaceId(workspaceId: string): boolean {
  if (!workspaceId || typeof workspaceId !== 'string') return false
  // Basic validation - adjust based on your workspace ID format
  return workspaceId.length > 0 && workspaceId.length < 100
}

/**
 * Get workspace type from workspace ID
 */
export function getWorkspaceType(workspaceId: string, userId?: string): 'personal' | 'organization' {
  if (!userId) return 'organization'
  return workspaceId === userId ? 'personal' : 'organization'
}

/**
 * Create a cache key for workspace-scoped data
 */
export function createCacheKey(workspaceId: string, path: string): string {
  return `${workspaceId}:${path}`
}

/**
 * Parse a cache key back into workspace ID and path
 */
export function parseCacheKey(key: string): { workspaceId: string; path: string } | null {
  const colonIndex = key.indexOf(':')
  if (colonIndex === -1) return null
  
  return {
    workspaceId: key.substring(0, colonIndex),
    path: key.substring(colonIndex + 1)
  }
}

/**
 * Check if a path matches a pattern
 */
export function pathMatchesPattern(path: string, pattern: RegExp): boolean {
  return pattern.test(path)
}

/**
 * Debounce function for optimizing frequent operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Convert error to user-friendly message
 */
export function formatErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred'
  
  if (typeof error === 'string') return error
  
  if (error.message) return error.message
  
  if (error.status) {
    switch (error.status) {
      case 401:
        return 'Authentication required'
      case 403:
        return 'Access denied'
      case 404:
        return 'Data not found'
      case 429:
        return 'Too many requests'
      case 500:
        return 'Server error'
      default:
        return `Error ${error.status}`
    }
  }
  
  return 'An unknown error occurred'
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Safe JSON stringify with fallback
 */
export function safeJsonStringify(obj: any, fallback = '{}'): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return fallback
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as any
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any
  
  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    
    return true
  }
  
  return a === b
}

/**
 * Get nested property from object using dot notation
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

/**
 * Set nested property in object using dot notation
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  
  const target = keys.reduce((current, key) => {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    return current[key]
  }, obj)
  
  target[lastKey] = value
}

/**
 * Remove nested property from object using dot notation
 */
export function removeNestedProperty(obj: any, path: string): boolean {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  
  try {
    const target = keys.reduce((current, key) => {
      return current?.[key]
    }, obj)
    
    if (target && typeof target === 'object' && lastKey in target) {
      delete target[lastKey]
      return true
    }
  } catch {
    // Ignore errors
  }
  
  return false
}