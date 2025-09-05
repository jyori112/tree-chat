'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileSystemProvider, useFileSystem } from '@/lib/data-store';
import { Plus, FileText, ArrowLeft, Calendar } from 'lucide-react';
import { generatePageId } from '@/lib/utils/id-generator';
import { EditableDisplayName } from '@/components/editable-display-name';
import { CreatePageModal, pageTemplates } from '@/components/create-page-modal';

interface PageInfo {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}


function SessionPagesContent() {
  const params = useParams();
  const fs = useFileSystem();
  const sessionId = params.sessionId as string;

  const [pages, setPages] = useState<PageInfo[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPageModal, setShowNewPageModal] = useState(false);

  const sessionPath = `/sessions/${sessionId}`;
  const pagesPath = `${sessionPath}/pages`;
  const sharedPath = `${sessionPath}/shared`;

  useEffect(() => {
    const loadSessionData = async () => {
      setIsLoading(true);
      try {
        // セッション名を読み込み
        try {
          const name = await fs.read(`${sessionPath}/name`);
          setSessionName(name);
        } catch {
          setSessionName(sessionId);
        }

        // ページ一覧を読み込み
        const pagesExists = await fs.exists(pagesPath);
        if (!pagesExists) {
          await fs.mkdir(pagesPath);
          setPages([]);
          return;
        }

        const pageIds = await fs.ls(pagesPath);
        const pageInfos: PageInfo[] = [];

        for (const pageId of pageIds) {
          try {
            const pagePath = `${pagesPath}/${pageId}`;

            let pageName = pageId;
            let pageType = 'unknown';
            let createdAt = new Date().toISOString();

            const nameExists = await fs.exists(`${pagePath}/name`);
            if (nameExists) {
              pageName = await fs.read(`${pagePath}/name`);
            }

            const typeExists = await fs.exists(`${pagePath}/type`);
            if (typeExists) {
              pageType = await fs.read(`${pagePath}/type`);
            }

            const createdExists = await fs.exists(`${pagePath}/created_at`);
            if (createdExists) {
              createdAt = await fs.read(`${pagePath}/created_at`);
            }

            pageInfos.push({
              id: pageId,
              name: pageName,
              type: pageType,
              createdAt
            });
          } catch (error) {
            console.error(`Failed to load page ${pageId}:`, error);
          }
        }

        // 作成日時でソート（新しい順）
        pageInfos.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setPages(pageInfos);
      } catch (error) {
        console.error('Failed to load session data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionData();
  }, [fs, sessionPath, pagesPath, sharedPath, sessionId]);

  const createNewPage = async (templateType: string) => {
    const template = pageTemplates.find(t => t.type === templateType);
    if (!template) return;

    // ユニークなページIDを生成
    let pageId = generatePageId();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const exists = await fs.exists(`${pagesPath}/${pageId}`);
      if (!exists) {
        break;
      }
      pageId = generatePageId();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      alert('ページの作成に失敗しました。もう一度お試しください。');
      return;
    }

    const pagePath = `${pagesPath}/${pageId}`;

    await fs.mkdir(pagePath);
    await fs.write(`${pagePath}/type`, templateType);
    await fs.write(`${pagePath}/name`, template.name);
    await fs.write(`${pagePath}/created_at`, new Date().toISOString());
    await fs.mkdir(`${pagePath}/fields`);

    // ページへ遷移
    window.location.href = `/sessions/${sessionId}/pages/${pageId}/${templateType}`;
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

  const getPageIcon = (type: string) => {
    const template = pageTemplates.find(t => t.type === type);
    return template ? template.icon : <FileText className="w-6 h-6" />;
  };

  const getPageColor = (type: string) => {
    const template = pageTemplates.find(t => t.type === type);
    return template ? template.color : 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/sessions"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                セッション一覧
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              {sessionName || (
                <EditableDisplayName
                  path={`${sessionPath}/name`}
                  defaultName={sessionId}
                  className="text-3xl font-bold text-gray-800"
                  onUpdate={(newName) => setSessionName(newName)}
                />
              )}
            </h1>
          </div>
          <button
            onClick={() => setShowNewPageModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            新規ページ作成
          </button>
        </div>

        {/* ページ一覧 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
              <p>ページを読み込み中...</p>
            </div>
          </div>
        ) : pages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              ページがありません
            </h2>
            <p className="text-gray-500 mb-6">
              テンプレートを選択して、最初のページを作成しましょう
            </p>
            <button
              onClick={() => setShowNewPageModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              最初のページを作成
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/sessions/${sessionId}/pages/${page.id}/${page.type}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getPageColor(page.type)}`}>
                    {getPageIcon(page.type)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                      {page.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(page.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 新規ページ作成モーダル */}
        <CreatePageModal
          isOpen={showNewPageModal}
          onClose={() => setShowNewPageModal(false)}
          onCreatePage={createNewPage}
        />
      </div>
    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <FileSystemProvider>
      <SessionPagesContent />
    </FileSystemProvider>
  );
}