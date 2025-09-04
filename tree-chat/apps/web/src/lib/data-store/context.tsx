'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FileSystem } from './file-system';
import { FileSystemStore } from './types';

// Singleton instance
let fsInstance: FileSystem | null = null;

async function getFileSystem(): Promise<FileSystem> {
  if (!fsInstance) {
    fsInstance = new FileSystem();
    await fsInstance.init();
  }
  return fsInstance;
}

// Context
const FileSystemContext = createContext<FileSystemStore | null>(null);

// Provider component
export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [fs, setFs] = useState<FileSystemStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getFileSystem()
      .then(setFs)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Initializing file system...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Failed to initialize file system: {error.message}</div>
      </div>
    );
  }

  return (
    <FileSystemContext.Provider value={fs}>
      {children}
    </FileSystemContext.Provider>
  );
}

// Hook to access file system
export function useFileSystem(): FileSystemStore {
  const fs = useContext(FileSystemContext);
  if (!fs) {
    throw new Error('useFileSystem must be used within FileSystemProvider');
  }
  return fs;
}