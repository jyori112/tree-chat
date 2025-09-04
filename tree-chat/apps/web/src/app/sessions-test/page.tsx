'use client';

import React, { useState } from 'react';
import { FileSystemProvider, useFileSystem, useSession } from '@/lib/data-store';
import Link from 'next/link';
import { Home, Plus, FolderOpen, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

function SessionsTestContent() {
  const fs = useFileSystem();
  const router = useRouter();
  const { sessionId, createSession } = useSession();
  const [newSessionName, setNewSessionName] = useState('');
  const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);

  // セッション一覧の読み込み
  React.useEffect(() => {
    const loadSessions = async () => {
      try {
        const rootDirs = await fs.ls('/sessions');
        const sessionList = [];
        
        for (const dir of rootDirs) {
          try {
            const name = await fs.read(`/sessions/${dir}/metadata/name`);
            sessionList.push({ id: dir, name });
          } catch {
            // metadata/nameが存在しない場合はスキップ
          }
        }
        
        setSessions(sessionList);
      } catch {
        setSessions([]);
      }
    };
    
    loadSessions();
  }, [fs, sessionId]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    const id = await createSession(newSessionName);
    
    // metadata構造を作成
    await fs.mkdir(`/sessions/${id}/metadata`);
    await fs.write(`/sessions/${id}/metadata/name`, newSessionName);
    await fs.write(`/sessions/${id}/metadata/created_at`, new Date().toISOString());
    
    // shared構造を作成
    await fs.mkdir(`/sessions/${id}/shared`);
    await fs.write(`/sessions/${id}/shared/business_name`, '');
    
    setNewSessionName('');
    
    // セッション一覧を更新
    setSessions(prev => [...prev, { id, name: newSessionName }]);
  };

  const createNewLeanCanvas = async (sessionId: string) => {
    const pageId = `lean-canvas-${Date.now()}`;
    const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
    
    // ページ構造を作成
    await fs.mkdir(pagePath);
    await fs.write(`${pagePath}/type`, 'lean-canvas');
    await fs.write(`${pagePath}/name`, 'リーンキャンバス');
    await fs.write(`${pagePath}/created_at`, new Date().toISOString());
    
    // フィールドディレクトリを作成
    await fs.mkdir(`${pagePath}/fields`);
    
    // リーンキャンバスページに遷移
    router.push(`/sessions/${sessionId}/pages/${pageId}/lean-canvas`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Sessions Test</h1>
          <Link 
            href="/" 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Session */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">新しいセッションを作成</h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="セッション名"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleCreateSession}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                作成
              </button>
            </div>
            
            {sessionId && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  現在のセッション: <span className="font-mono">{sessionId}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">セッション一覧</h2>
          
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">セッションがありません</p>
            ) : (
              sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{session.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{session.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => createNewLeanCanvas(session.id)}
                    className="px-3 py-1 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 flex items-center gap-1"
                  >
                    リーンキャンバスを開く
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Test Navigation */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">テスト用リンク</h2>
        <div className="space-y-2">
          <Link
            href="/sessions/test-session/pages/test-page/lean-canvas"
            className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-blue-700">
              → テストセッション/テストページのリーンキャンバスを開く
            </span>
            <p className="text-xs text-gray-600 mt-1">
              /sessions/test-session/pages/test-page/lean-canvas
            </p>
          </Link>
          
          {sessionId && (
            <button
              onClick={() => createNewLeanCanvas(sessionId)}
              className="w-full text-left p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-green-700">
                → 現在のセッションに新しいリーンキャンバスを作成
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionsTestPage() {
  return (
    <FileSystemProvider>
      <SessionsTestContent />
    </FileSystemProvider>
  );
}