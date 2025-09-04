'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFileSystem } from './context';
import { FSEvent } from './types';

// Hook to watch and manage a file
export function useFileWatch<T = any>(
  path: string,
  defaultValue: T
): {
  data: T;
  loading: boolean;
  error: Error | null;
  setData: (data: T) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const fs = useFileSystem();
  const [data, setDataState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fileData = await fs.read(path);
      setDataState(fileData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        // File doesn't exist, use default value
        setDataState(defaultValue);
      } else {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [fs, path]); // Remove defaultValue from dependencies to avoid loops

  const setData = useCallback(async (newData: T) => {
    try {
      await fs.write(path, newData);
      setDataState(newData);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [fs, path]);

  useEffect(() => {
    // Initial load
    loadData();

    // Watch for changes
    const unwatch = fs.watch(path, (event: FSEvent) => {
      if (event.type === 'delete') {
        setDataState(defaultValue);
      } else if (event.type === 'update' || event.type === 'create') {
        loadData();
      }
    });

    return unwatch;
  }, [fs, path, loadData]); // Remove defaultValue to avoid re-running effect

  return {
    data,
    loading,
    error,
    setData,
    refresh: loadData
  };
}

// Hook to watch a directory
export function useDirWatch(
  path: string
): {
  files: string[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const fs = useFileSystem();
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fileList = await fs.ls(path);
      setFiles(fileList);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        setFiles([]);
      } else {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [fs, path]);

  useEffect(() => {
    // Initial load
    loadFiles();

    // Watch for changes in directory
    const pattern = `${path}/*`;
    const unwatch = fs.watch(pattern, () => {
      loadFiles();
    });

    return unwatch;
  }, [fs, path, loadFiles]);

  return {
    files,
    loading,
    error,
    refresh: loadFiles
  };
}

// Hook for debounced writes
export function useDebouncedFileWrite(
  path: string,
  delay: number = 500
): (data: any) => void {
  const fs = useFileSystem();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const write = useCallback((data: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fs.write(path, data).catch(console.error);
    }, delay);
  }, [fs, path, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return write;
}

// Hook to check if a file exists
export function useFileExists(path: string): {
  exists: boolean;
  loading: boolean;
  error: Error | null;
} {
  const fs = useFileSystem();
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fs.exists(path)
      .then(setExists)
      .catch(err => {
        setError(err as Error);
        setExists(false);
      })
      .finally(() => setLoading(false));

    // Watch for creation/deletion
    const unwatch = fs.watch(path, (event: FSEvent) => {
      if (event.type === 'create') {
        setExists(true);
      } else if (event.type === 'delete') {
        setExists(false);
      }
    });

    return unwatch;
  }, [fs, path]);

  return { exists, loading, error };
}

// Hook for session management
export function useSession(sessionId?: string) {
  const fs = useFileSystem();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);

  const createSession = useCallback(async (name: string): Promise<string> => {
    const id = crypto.randomUUID();
    const sessionPath = `/sessions/${id}`;
    
    await fs.mkdir(`${sessionPath}/workspaces`);
    await fs.mkdir(`${sessionPath}/shared`);
    await fs.write(`${sessionPath}/metadata.json`, {
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setCurrentSessionId(id);
    localStorage.setItem('lastSessionId', id);
    
    return id;
  }, [fs]);

  const loadSession = useCallback(async (id: string) => {
    const exists = await fs.exists(`/sessions/${id}`);
    if (!exists) {
      throw new Error(`Session not found: ${id}`);
    }
    
    setCurrentSessionId(id);
    localStorage.setItem('lastSessionId', id);
  }, [fs]);

  // Auto-load last session on mount
  useEffect(() => {
    if (!currentSessionId) {
      const lastId = localStorage.getItem('lastSessionId');
      if (lastId) {
        fs.exists(`/sessions/${lastId}`).then(exists => {
          if (exists) {
            setCurrentSessionId(lastId);
            localStorage.setItem('lastSessionId', lastId);
          }
        }).catch(console.error);
      }
    }
  }, [currentSessionId, fs]);

  return {
    sessionId: currentSessionId,
    createSession,
    loadSession
  };
}