'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileSystemProvider, useFileSystem } from '@/lib/data-store';
import { Plus, FolderOpen, Calendar, ChevronRight, Home } from 'lucide-react';
import { generateSessionId } from '@/lib/utils/id-generator';

interface SessionInfo {
  id: string;
  name: string;
  createdAt: string;
  pageCount: number;
}

function SessionsListContent() {
  const fs = useFileSystem();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        // /sessions ディレクトリを確認
        const sessionsExists = await fs.exists('/sessions');
        if (!sessionsExists) {
          await fs.mkdir('/sessions');
          setSessions([]);
          return;
        }

        // セッション一覧を取得
        const sessionDirs = await fs.ls('/sessions');
        const sessionInfos: SessionInfo[] = [];

        for (const sessionId of sessionDirs) {
          try {
            // セッション情報を読み込み
            const sessionPath = `/sessions/${sessionId}`;

            // セッション名（デフォルトはsessionId）
            let sessionName = sessionId;
            const nameExists = await fs.exists(`${sessionPath}/name`);
            if (nameExists) {
              sessionName = await fs.read(`${sessionPath}/name`);
            }

            // 作成日時
            let createdAt = new Date().toISOString();
            const createdExists = await fs.exists(`${sessionPath}/created_at`);
            if (createdExists) {
              createdAt = await fs.read(`${sessionPath}/created_at`);
            }

            // ページ数をカウント
            let pageCount = 0;
            const pagesExists = await fs.exists(`${sessionPath}/pages`);
            if (pagesExists) {
              const pages = await fs.ls(`${sessionPath}/pages`);
              pageCount = pages.length;
            }

            sessionInfos.push({
              id: sessionId,
              name: sessionName,
              createdAt,
              pageCount,
            });
          } catch (error) {
            console.error(`Failed to load session ${sessionId}:`, error);
          }
        }

        // 作成日時でソート（新しい順）
        sessionInfos.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setSessions(sessionInfos);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [fs]);

  const createNewSession = async () => {
    // ユニークなセッションIDを生成（重複チェック付き）
    let sessionId = generateSessionId();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const exists = await fs.exists(`/sessions/${sessionId}`);
      if (!exists) {
        break;
      }
      sessionId = generateSessionId();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      alert('セッションの作成に失敗しました。もう一度お試しください。');
      return;
    }

    const sessionPath = `/sessions/${sessionId}`;

    await fs.mkdir(sessionPath);
    await fs.write(`${sessionPath}/name`, '新規プロジェクト');
    await fs.write(`${sessionPath}/created_at`, new Date().toISOString());
    await fs.mkdir(`${sessionPath}/pages`);
    await fs.mkdir(`${sessionPath}/shared`);

    // ページ一覧へ遷移
    window.location.href = `/sessions/${sessionId}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Home className="w-4 h-4" />
              ホームに戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">セッション一覧</h1>
            <p className="text-gray-600 mt-2">ビジネス開発セッションを管理</p>
          </div>
          <button
            onClick={createNewSession}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            新規セッション作成
          </button>
        </div>

        {/* セッション一覧 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
              <p>セッションを読み込み中...</p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              セッションがありません
            </h2>
            <p className="text-gray-500 mb-6">
              新しいセッションを作成して、ビジネス開発を始めましょう
            </p>
            <button
              onClick={createNewSession}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              最初のセッションを作成
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FolderOpen className="w-6 h-6 text-blue-500" />
                      <h2 className="text-xl font-semibold text-gray-800">
                        {session.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(session.createdAt)}</span>
                      </div>
                      <div>
                        <span className="font-medium">{session.pageCount}</span> ページ
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionsPage() {
  return (
    <FileSystemProvider>
      <SessionsListContent />
    </FileSystemProvider>
  );
}