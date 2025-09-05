'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileSystemProvider, useFileSystem } from '@/lib/data-store';
import { PageMenu } from '@/components/page-menu';
import { PageNavigation } from '@/components/page-navigation';
import { CreatePageModal } from '@/components/create-page-modal';
import { FSTextInput } from '@/components/fs-inputs';
import { Plus, Home } from 'lucide-react';
import Link from 'next/link';
import { usePageOrder } from '@/hooks/use-page-order';
import { generatePageId } from '@/lib/utils/id-generator';

function PageLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const fs = useFileSystem();
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const { addPageToOrder } = usePageOrder(sessionId);
  const pagePath = `/sessions/${sessionId}/pages/${pageId}`;

  const createNextPage = () => {
    setShowNewPageModal(true);
  };

  const handleCreatePage = async (templateType: string) => {
    // ユニークなページIDを生成
    let newPageId = generatePageId();
    let attempts = 0;
    const maxAttempts = 10;
    const pagesPath = `/sessions/${sessionId}/pages`;
    
    while (attempts < maxAttempts) {
      const exists = await fs.exists(`${pagesPath}/${newPageId}`);
      if (!exists) {
        break;
      }
      newPageId = generatePageId();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      alert('ページの作成に失敗しました。もう一度お試しください。');
      return;
    }
    
    const newPagePath = `${pagesPath}/${newPageId}`;
    
    // ページを作成
    await fs.mkdir(newPagePath);
    await fs.write(`${newPagePath}/type`, templateType);
    await fs.write(`${newPagePath}/name`, templateType);
    await fs.write(`${newPagePath}/created_at`, new Date().toISOString());
    await fs.mkdir(`${newPagePath}/fields`);
    
    // ページを順序リストに追加（現在のページの後）
    await addPageToOrder(newPageId, pageId);
    
    // 新しいページへ遷移
    router.push(`/sessions/${sessionId}/pages/${newPageId}/${templateType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hamburger Menu - Outside of header */}
      <PageMenu
        sessionId={sessionId}
        currentPageId={pageId}
        onAddPage={createNextPage}
      />
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 pl-12">
            {/* Home Link */}
            <Link 
              href="/" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="ホームに戻る"
            >
              <Home className="w-5 h-5" />
            </Link>
            
            {/* Page Name Input */}
            <FSTextInput
              path={`${pagePath}/name`}
              placeholder="ページ名を入力してください"
              defaultValue="ページ"
              className="text-lg font-semibold bg-transparent border-0 border-b-2 border-gray-300 focus:border-blue-500"
            />
          </div>
          
          {/* Add Next Page Button */}
          <button
            onClick={createNextPage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            title="次のページを作成"
          >
            <Plus className="w-5 h-5" />
            <span>ページを追加</span>
          </button>
        </div>
      </header>

      {/* Page Navigation - Left/Right margins */}
      <PageNavigation
        sessionId={sessionId}
        currentPageId={pageId}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* New Page Modal */}
      <CreatePageModal
        isOpen={showNewPageModal}
        onClose={() => setShowNewPageModal(false)}
        onCreatePage={handleCreatePage}
      />
    </div>
  );
}

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <FileSystemProvider>
      <PageLayoutContent>{children}</PageLayoutContent>
    </FileSystemProvider>
  );
}