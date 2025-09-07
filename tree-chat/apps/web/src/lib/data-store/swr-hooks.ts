'use client';

import useSWR from 'swr';
import { useFileSystem } from './context';

/**
 * SWR-based data reading hook
 * Replaces useFileWatch with SWR pattern
 */
export function useReadFrom<T = any>(path: string, defaultValue?: T) {
  const fs = useFileSystem();
  
  const { data, error, isLoading, mutate } = useSWR(
    path,
    async (path: string) => {
      try {
        return await fs.read(path);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          // File doesn't exist, return default value
          return defaultValue;
        }
        throw err;
      }
    },
    {
      // SWR設定
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // ポーリング無効
      errorRetryCount: 1,
      fallbackData: defaultValue, // 初期値
    }
  );

  return {
    data: data ?? defaultValue,
    loading: isLoading,
    error,
    refresh: mutate, // 手動更新用
  };
}

/**
 * Directory listing hook
 * Replaces useDirWatch with SWR pattern
 */
export function useReadDir(path: string) {
  const fs = useFileSystem();
  
  const { data, error, isLoading, mutate } = useSWR(
    `${path}/*`,
    async () => {
      try {
        return await fs.ls(path);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          return [];
        }
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      errorRetryCount: 1,
      fallbackData: [],
    }
  );

  return {
    files: data ?? [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * File existence check hook
 */
export function useFileExists(path: string) {
  const fs = useFileSystem();
  
  const { data, error, isLoading, mutate } = useSWR(
    `exists:${path}`,
    async () => await fs.exists(path),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      errorRetryCount: 1,
      fallbackData: false,
    }
  );

  return {
    exists: data ?? false,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}