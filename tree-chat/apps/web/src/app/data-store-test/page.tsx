'use client';

import React, { useState } from 'react';
import { FileSystemProvider, useFileSystem, useFileWatch, useDirWatch, useSession, useDebouncedFileWrite } from '@/lib/data-store';
import Link from 'next/link';
import { Home, FolderOpen, File, RefreshCw, Plus, Trash2 } from 'lucide-react';

function DataStoreTestContent() {
  const fs = useFileSystem();
  const { sessionId, createSession, loadSession } = useSession();
  const [newSessionName, setNewSessionName] = useState('');
  const [testPath, setTestPath] = useState('/test/example.json');
  const [writeData, setWriteData] = useState('{"message": "Hello, FileSystem!"}');
  const [commandLog, setCommandLog] = useState<string[]>([]);

  // Watch a test file
  const { data: fileData, loading: fileLoading, error: fileError, setData: setFileData } = useFileWatch(
    sessionId ? `/sessions/${sessionId}/test.json` : '/test/default.json',
    { content: 'Default content' }
  );

  // Watch root directory
  const { files: rootFiles, refresh: refreshRoot } = useDirWatch('/');

  // Watch session directory
  const { files: sessionFiles } = useDirWatch(
    sessionId ? `/sessions/${sessionId}` : '/'
  );

  // Debounced write for auto-save
  const debouncedWrite = useDebouncedFileWrite(
    sessionId ? `/sessions/${sessionId}/autosave.json` : '/test/autosave.json'
  );

  const addLog = (message: string) => {
    setCommandLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 10));
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    try {
      const id = await createSession(newSessionName);
      addLog(`Created session: ${newSessionName} (${id})`);
      setNewSessionName('');
    } catch (error) {
      addLog(`Error creating session: ${error}`);
    }
  };

  const handleWriteFile = async () => {
    try {
      const data = JSON.parse(writeData);
      await fs.write(testPath, data);
      addLog(`Wrote to ${testPath}`);
    } catch (error) {
      addLog(`Error writing file: ${error}`);
    }
  };

  const handleReadFile = async () => {
    try {
      const data = await fs.read(testPath);
      addLog(`Read from ${testPath}: ${JSON.stringify(data)}`);
    } catch (error) {
      addLog(`Error reading file: ${error}`);
    }
  };

  const handleDeleteFile = async () => {
    try {
      await fs.rm(testPath);
      addLog(`Deleted ${testPath}`);
    } catch (error) {
      addLog(`Error deleting file: ${error}`);
    }
  };

  const handleCreateDirectory = async () => {
    const dirPath = '/test/new-directory';
    try {
      await fs.mkdir(dirPath);
      addLog(`Created directory: ${dirPath}`);
    } catch (error) {
      addLog(`Error creating directory: ${error}`);
    }
  };

  const handleListDirectory = async (path: string) => {
    try {
      const files = await fs.ls(path);
      addLog(`Contents of ${path}: ${files.join(', ') || '(empty)'}`);
    } catch (error) {
      addLog(`Error listing directory: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Data Store Test Page</h1>
          <Link 
            href="/" 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Management */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Session Management</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Current Session: <span className="font-mono">{sessionId || 'None'}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Session name"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleCreateSession}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {sessionId && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Session Files:</p>
                <div className="space-y-1">
                  {sessionFiles.length === 0 ? (
                    <p className="text-gray-400 text-sm">No files in session</p>
                  ) : (
                    sessionFiles.map(file => (
                      <div key={file} className="flex items-center gap-2 text-sm">
                        <File className="w-3 h-3 text-gray-400" />
                        <span className="font-mono">{file}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Operations */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">File Operations</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Path:</label>
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data (JSON):</label>
              <textarea
                value={writeData}
                onChange={(e) => setWriteData(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm h-24"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleWriteFile}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Write
              </button>
              <button
                onClick={handleReadFile}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Read
              </button>
              <button
                onClick={handleDeleteFile}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                Delete
              </button>
              <button
                onClick={handleCreateDirectory}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
              >
                Create Dir
              </button>
            </div>
          </div>
        </div>

        {/* File Watch Demo */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">File Watch Demo</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Watching: {sessionId ? `/sessions/${sessionId}/test.json` : '/test/default.json'}
              </p>
              {fileLoading ? (
                <p className="text-gray-400">Loading...</p>
              ) : fileError ? (
                <p className="text-red-500 text-sm">Error: {fileError.message}</p>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <pre className="text-sm font-mono">{JSON.stringify(fileData, null, 2)}</pre>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Update watched file:</label>
              <input
                type="text"
                placeholder="Enter new content"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    setFileData({ content: target.value });
                    target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Press Enter to update</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Auto-save (debounced):</label>
              <input
                type="text"
                placeholder="Type to auto-save..."
                onChange={(e) => debouncedWrite({ text: e.target.value, timestamp: Date.now() })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Saves automatically after 500ms</p>
            </div>
          </div>
        </div>

        {/* Directory Listing */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Directory Listing</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Root Directory:</p>
                <button
                  onClick={refreshRoot}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-1">
                {rootFiles.length === 0 ? (
                  <p className="text-gray-400 text-sm">Empty</p>
                ) : (
                  rootFiles.map(file => (
                    <button
                      key={file}
                      onClick={() => handleListDirectory(`/${file}`)}
                      className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded w-full text-left"
                    >
                      <FolderOpen className="w-3 h-3 text-gray-400" />
                      <span className="font-mono">{file}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Command Log */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Command Log</h2>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {commandLog.length === 0 ? (
            <p className="text-gray-400 text-sm">No commands executed yet</p>
          ) : (
            commandLog.map((log, index) => (
              <div key={index} className="text-sm font-mono text-gray-600">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function DataStoreTestPage() {
  return (
    <FileSystemProvider>
      <DataStoreTestContent />
    </FileSystemProvider>
  );
}