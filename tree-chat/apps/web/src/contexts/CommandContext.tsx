'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSWRConfig } from 'swr';
import { useFileSystem } from '@/lib/data-store';
import type { FSCommand } from '@/lib/data-store/types';

// Extend FSCommand for higher-level operations
export interface Command extends FSCommand {
  // Additional metadata can be added here
  description?: string;
  timestamp?: Date;
}

interface CommandContextType {
  executeCommand: (command: Command) => Promise<void>;
}

const CommandContext = createContext<CommandContextType | null>(null);

export function CommandProvider({ children }: { children: ReactNode }) {
  const fs = useFileSystem();
  const { mutate } = useSWRConfig(); // Global mutate for SWR

  const executeCommand = async (command: Command) => {
    try {
      // 1. Execute command in File System
      await fs.execute(command);
      
      // 2. Invalidate affected SWR cache entries
      await mutateAffectedPaths(command, mutate);
      
    } catch (error) {
      console.error('Command execution failed:', error);
      throw error;
    }
  };

  return (
    <CommandContext.Provider value={{ executeCommand }}>
      {children}
    </CommandContext.Provider>
  );
}

// Custom hook to use commands
export function useCommands() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('useCommands must be used within CommandProvider');
  }
  return context;
}

/**
 * Determine which SWR cache entries need to be invalidated based on command
 */
async function mutateAffectedPaths(
  command: Command, 
  mutate: (key?: any) => Promise<any>
) {
  const affectedPaths: string[] = [];
  
  switch (command.type) {
    case 'write':
    case 'rm': {
      // The file itself
      affectedPaths.push(command.path);
      
      // Parent directory (for ls operations)
      const parentDir = command.path.substring(0, command.path.lastIndexOf('/'));
      if (parentDir) {
        affectedPaths.push(`${parentDir}/*`);
      }
      
      // File existence check
      affectedPaths.push(`exists:${command.path}`);
      break;
    }
      
    case 'mkdir': {
      // The directory itself
      affectedPaths.push(command.path);
      
      // Parent directory
      const parentDirForMkdir = command.path.substring(0, command.path.lastIndexOf('/'));
      if (parentDirForMkdir) {
        affectedPaths.push(`${parentDirForMkdir}/*`);
      }
      
      // Existence check
      affectedPaths.push(`exists:${command.path}`);
      break;
    }
      
    case 'mv': {
      // Both source and target paths
      affectedPaths.push(command.path);
      if (command.target) {
        affectedPaths.push(command.target);
        affectedPaths.push(`exists:${command.target}`);
      }
      affectedPaths.push(`exists:${command.path}`);
      
      // Parent directories
      const sourceParent = command.path.substring(0, command.path.lastIndexOf('/'));
      if (sourceParent) {
        affectedPaths.push(`${sourceParent}/*`);
      }
      if (command.target) {
        const targetParent = command.target.substring(0, command.target.lastIndexOf('/'));
        if (targetParent) {
          affectedPaths.push(`${targetParent}/*`);
        }
      }
      break;
    }
  }
  
  // Invalidate all affected paths
  for (const path of affectedPaths) {
    try {
      await mutate(path);
    } catch (error) {
      console.warn(`Failed to mutate ${path}:`, error);
    }
  }
}