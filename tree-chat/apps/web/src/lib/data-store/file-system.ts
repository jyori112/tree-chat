// FileSystem Data Store Implementation

import { FSNode, FSEvent, FSCommand, FileSystemStore, WatchCallback } from './types';

export class FileSystem implements FileSystemStore {
  private root: FSNode;
  private watchers: Map<string, Set<WatchCallback>>;
  private db: IDBDatabase | null = null;
  private dbName = 'FileSystemStore';
  private persistTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.root = {
      type: 'directory',
      name: '/',
      children: new Map(),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    this.watchers = new Map();
  }

  async init(): Promise<void> {
    // Initialize IndexedDB
    const request = indexedDB.open(this.dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'id' });
      }
    };

    this.db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Load last snapshot if exists
    await this.loadSnapshot();
  }

  private async loadSnapshot(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['snapshots'], 'readonly');
      const store = transaction.objectStore('snapshots');
      const request = store.get('current');

      const snapshot = await new Promise<any>((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });

      if (snapshot && snapshot.root) {
        this.root = this.deserializeNode(snapshot.root);
      }
    } catch (error) {
      console.warn('Failed to load snapshot:', error);
    }
  }

  private async saveSnapshot(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');

      await store.put({
        id: 'current',
        root: this.serializeNode(this.root),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }

  private serializeNode(node: FSNode): any {
    if (node.type === 'file') {
      return {
        type: 'file',
        name: node.name,
        data: node.data,
        metadata: {
          ...node.metadata,
          createdAt: node.metadata?.createdAt?.toISOString(),
          updatedAt: node.metadata?.updatedAt?.toISOString()
        }
      };
    } else {
      const children: any[] = [];
      if (node.children) {
        for (const [name, child] of node.children.entries()) {
          children.push({
            name,
            ...this.serializeNode(child)
          });
        }
      }
      return {
        type: 'directory',
        name: node.name,
        children,
        metadata: {
          ...node.metadata,
          createdAt: node.metadata?.createdAt?.toISOString(),
          updatedAt: node.metadata?.updatedAt?.toISOString()
        }
      };
    }
  }

  private deserializeNode(data: any): FSNode {
    if (data.type === 'file') {
      return {
        type: 'file',
        name: data.name,
        data: data.data,
        metadata: {
          ...data.metadata,
          createdAt: data.metadata?.createdAt ? new Date(data.metadata.createdAt) : new Date(),
          updatedAt: data.metadata?.updatedAt ? new Date(data.metadata.updatedAt) : new Date()
        }
      };
    } else {
      const node: FSNode = {
        type: 'directory',
        name: data.name,
        children: new Map(),
        metadata: {
          ...data.metadata,
          createdAt: data.metadata?.createdAt ? new Date(data.metadata.createdAt) : new Date(),
          updatedAt: data.metadata?.updatedAt ? new Date(data.metadata.updatedAt) : new Date()
        }
      };
      
      if (data.children && Array.isArray(data.children)) {
        for (const child of data.children) {
          const childNode = this.deserializeNode(child);
          node.children!.set(child.name, childNode);
        }
      }
      
      return node;
    }
  }

  private navigate(path: string): FSNode | null {
    const parts = path.split('/').filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (current.type !== 'directory' || !current.children?.has(part)) {
        return null;
      }
      current = current.children.get(part)!;
    }

    return current;
  }

  async write(path: string, data: any): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Cannot write to root');
    }

    const fileName = parts.pop()!;
    let current = this.root;

    // Navigate/create directories
    for (const part of parts) {
      if (current.type !== 'directory') {
        throw new Error(`${current.name} is not a directory`);
      }

      if (!current.children!.has(part)) {
        current.children!.set(part, {
          type: 'directory',
          name: part,
          children: new Map(),
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      current = current.children!.get(part)!;
    }

    if (current.type !== 'directory') {
      throw new Error(`Cannot write to ${path}: parent is not a directory`);
    }

    const isNew = !current.children!.has(fileName);
    const existingNode = current.children!.get(fileName);

    current.children!.set(fileName, {
      type: 'file',
      name: fileName,
      data: data,
      metadata: {
        createdAt: isNew ? new Date() : existingNode?.metadata?.createdAt || new Date(),
        updatedAt: new Date(),
        size: JSON.stringify(data).length
      }
    });

    this.emit({
      type: isNew ? 'create' : 'update',
      path: path,
      data: data
    });

    this.schedulePersist();
  }

  async read(path: string): Promise<any> {
    const node = this.navigate(path);
    if (!node) {
      throw new Error(`File not found: ${path}`);
    }
    if (node.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }
    return node.data;
  }

  async exists(path: string): Promise<boolean> {
    return this.navigate(path) !== null;
  }

  async rm(path: string, recursive: boolean = false): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Cannot remove root');
    }

    const name = parts.pop()!;
    const parentPath = '/' + parts.join('/');
    const parent = parts.length === 0 ? this.root : this.navigate(parentPath);

    if (!parent || parent.type !== 'directory') {
      throw new Error(`Parent directory not found: ${parentPath}`);
    }

    const node = parent.children!.get(name);
    if (!node) {
      throw new Error(`File not found: ${path}`);
    }

    if (node.type === 'directory' && node.children!.size > 0 && !recursive) {
      throw new Error(`Directory not empty: ${path}`);
    }

    parent.children!.delete(name);

    this.emit({
      type: 'delete',
      path: path
    });

    this.schedulePersist();
  }

  async mkdir(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (current.type !== 'directory') {
        throw new Error(`${current.name} is not a directory`);
      }

      if (!current.children!.has(part)) {
        current.children!.set(part, {
          type: 'directory',
          name: part,
          children: new Map(),
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        this.emit({
          type: 'create',
          path: '/' + parts.slice(0, parts.indexOf(part) + 1).join('/')
        });
      }

      current = current.children!.get(part)!;
    }

    this.schedulePersist();
  }

  async ls(path: string): Promise<string[]> {
    const node = this.navigate(path);
    if (!node) {
      throw new Error(`Directory not found: ${path}`);
    }
    if (node.type !== 'directory') {
      throw new Error(`${path} is not a directory`);
    }
    return Array.from(node.children?.keys() || []);
  }

  watch(pattern: string, callback: WatchCallback): () => void {
    if (!this.watchers.has(pattern)) {
      this.watchers.set(pattern, new Set());
    }

    this.watchers.get(pattern)!.add(callback);

    return () => {
      this.watchers.get(pattern)?.delete(callback);
      if (this.watchers.get(pattern)?.size === 0) {
        this.watchers.delete(pattern);
      }
    };
  }

  private emit(event: FSEvent): void {
    for (const [pattern, callbacks] of this.watchers) {
      if (this.matchPattern(pattern, event.path)) {
        callbacks.forEach(cb => cb(event));
      }
    }
  }

  private matchPattern(pattern: string, path: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]+')
      .replace(/___DOUBLE_STAR___/g, '.*');

    return new RegExp(`^${regexPattern}$`).test(path);
  }

  async execute(command: FSCommand): Promise<void> {
    switch (command.type) {
      case 'write':
        return this.write(command.path, command.data);
      case 'mkdir':
        return this.mkdir(command.path);
      case 'rm':
        return this.rm(command.path, command.options?.recursive);
      case 'mv':
        if (!command.target) throw new Error('Target path required for mv');
        const data = await this.read(command.path);
        await this.write(command.target, data);
        await this.rm(command.path);
        break;
      default:
        throw new Error(`Unknown command: ${command.type}`);
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.saveSnapshot();
      this.persistTimer = null;
    }, 1000);
  }
}