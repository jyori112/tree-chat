/**
 * Simple data hooks for session management
 * Mock implementation for demonstration purposes
 */

import { useState, useEffect, useCallback } from 'react'
import { Session } from '@/types/session'

// Mock session data - using fixed timestamps to avoid hydration errors
const baseTime = 1726020000000; // Fixed base timestamp
const mockSessions: Session[] = [
  {
    id: '1',
    title: 'Project Planning Session',
    description: 'Planning the next quarter goals',
    workspaceId: 'workspace1',
    userId: 'user1',
    createdAt: baseTime - 86400000, // 1 day ago
    updatedAt: baseTime - 43200000, // 12 hours ago
    lastAccessedAt: baseTime - 3600000, // 1 hour ago
    version: 1
  },
  {
    id: '2',
    title: 'Team Meeting Notes',
    description: 'Weekly sync discussion points',
    workspaceId: 'workspace1',
    userId: 'user1',
    createdAt: baseTime - 172800000, // 2 days ago
    updatedAt: baseTime - 86400000, // 1 day ago
    lastAccessedAt: baseTime - 7200000, // 2 hours ago
    version: 1
  }
]

interface UseReadOptions {
  defaultValue?: any
  immediate?: boolean
  cache?: boolean
  cacheDuration?: number
}

interface UseReadResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useReadWithDefault<T>(
  path: string, 
  options: UseReadOptions = {}
): UseReadResult<T> {
  const [data, setData] = useState<T | null>(options.defaultValue || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Return mock data for sessions list
      if (path.includes('list')) {
        setData(mockSessions as any)
      } else {
        setData(options.defaultValue || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [path]) // Remove options.defaultValue from dependencies

  useEffect(() => {
    if (options.immediate !== false) {
      fetchData()
    }
  }, [path]) // Remove fetchData from dependencies to prevent infinite loop

  return {
    data,
    loading,
    error,
    refresh: fetchData
  }
}

export function useRead<T>(path: string): UseReadResult<T> {
  return useReadWithDefault<T>(path, { immediate: true })
}

export function useWritePath(path: string) {
  return {
    write: async (data: any) => {
      console.log(`Writing to ${path}:`, data)
      // Mock write operation
      await new Promise(resolve => setTimeout(resolve, 50))
      return data
    }
  }
}

export function useBatch() {
  return {
    executeBatch: async (operations: Array<{ path: string; value: any }>) => {
      console.log('Executing batch operations:', operations)
      // Mock batch execution
      await new Promise(resolve => setTimeout(resolve, 100))
      return operations
    }
  }
}