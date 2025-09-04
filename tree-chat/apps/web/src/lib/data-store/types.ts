// FileSystem Data Store Types

export interface FSNode {
  type: 'file' | 'directory';
  name: string;
  data?: any;
  children?: Map<string, FSNode>;
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    size?: number;
  };
}

export interface FSEvent {
  type: 'create' | 'update' | 'delete' | 'rename';
  path: string;
  data?: any;
  oldPath?: string;
}

export interface FSCommand {
  type: 'write' | 'mkdir' | 'rm' | 'mv';
  path: string;
  data?: any;
  target?: string;
  options?: {
    recursive?: boolean;
    force?: boolean;
  };
}

export type WatchCallback = (event: FSEvent) => void;

export interface FileSystemStore {
  // Basic operations
  write(path: string, data: any): Promise<void>;
  read(path: string): Promise<any>;
  exists(path: string): Promise<boolean>;
  rm(path: string, recursive?: boolean): Promise<void>;
  mkdir(path: string): Promise<void>;
  ls(path: string): Promise<string[]>;
  
  // Watch operations
  watch(pattern: string, callback: WatchCallback): () => void;
  
  // Command execution
  execute(command: FSCommand): Promise<void>;
  
  // Initialization
  init(): Promise<void>;
}