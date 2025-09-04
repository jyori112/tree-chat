'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileSystemProvider, useFileSystem } from '@/lib/data-store';
import { Plus, FileText, Target, Home, ArrowLeft, Calendar, Edit2 } from 'lucide-react';

interface PageInfo {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

interface PageTemplate {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const pageTemplates: PageTemplate[] = [
  {
    type: 'lean-canvas',
    name: 'リーンキャンバス',
    description: 'ビジネスモデルを1枚で可視化',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    type: 'swot-analysis',
    name: 'SWOT分析',
    description: '強み・弱み・機会・脅威を分析',
    icon: <Target className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-600'
  }
];

function SessionPagesContent() {
  const params = useParams();
  const fs = useFileSystem();
  const sessionId = params.sessionId as string;
  
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [businessName, setBusinessName] = useState('');
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

        // 事業名を読み込み
        try {
          const businessNameData = await fs.read(`${sharedPath}/business_name`);
          setBusinessName(businessNameData);
        } catch {}

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

            try {
              const nameExists = await fs.exists(`${pagePath}/name`);
              if (nameExists) {
                pageName = await fs.read(`${pagePath}/name`);
              }
            } catch {}

            try {
              const typeExists = await fs.exists(`${pagePath}/type`);
              if (typeExists) {
                pageType = await fs.read(`${pagePath}/type`);
              }
            } catch {}

            try {
              const createdExists = await fs.exists(`${pagePath}/created_at`);
              if (createdExists) {
                createdAt = await fs.read(`${pagePath}/created_at`);
              }
            } catch {}

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

    const pageId = `page-${Date.now()}`;
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
              {businessName || sessionName}
            </h1>
            {businessName && (
              <p className="text-gray-600 mt-2">セッション: {sessionName}</p>
            )}
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
        {showNewPageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                テンプレートを選択
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                {pageTemplates.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => {
                      createNewPage(template.type);
                      setShowNewPageModal(false);
                    }}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${template.color}`}>
                        {template.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNewPageModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
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