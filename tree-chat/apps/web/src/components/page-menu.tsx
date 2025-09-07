'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Menu, X, GripVertical, Plus } from 'lucide-react';
import { usePageOrder } from '@/hooks/use-page-order';
import { useFileSystem } from '@/lib/data-store';

interface PageInfo {
  id: string;
  name: string;
  type: string;
}

interface PageMenuProps {
  sessionId: string;
  currentPageId?: string;
  onAddPage?: (afterPageId: string) => void;
}

export function PageMenu({ sessionId, currentPageId, onAddPage }: PageMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const fs = useFileSystem();
  const { pageOrder, updatePageOrder, addPageToOrder: _addPageToOrder } = usePageOrder(sessionId);

  const pagesPath = `/sessions/${sessionId}/pages`;

  // ページ情報の読み込み
  useEffect(() => {
    const loadPages = async () => {
      try {
        const pageIds = await fs.ls(pagesPath);
        const pageInfos: PageInfo[] = [];

        for (const pageId of pageIds) {
          try {
            const pagePath = `${pagesPath}/${pageId}`;
            let pageName = pageId;
            let pageType = 'unknown';

            try {
              const nameData = await fs.read(`${pagePath}/name`);
              pageName = nameData;
            } catch {
              // Use default pageId as name
            }

            try {
              const typeData = await fs.read(`${pagePath}/type`);
              pageType = typeData;
            } catch {
              // Type remains 'unknown'
            }

            pageInfos.push({
              id: pageId,
              name: pageName,
              type: pageType
            });

            // ページを順序リストに追加（まだ存在しない場合）
            // NOTE: ここでは追加しない（無限ループを防ぐため）
          } catch (error) {
            console.error(`Failed to load page ${pageId}:`, error);
          }
        }

        setPages(pageInfos);
      } catch (error) {
        console.error('Failed to load pages:', error);
      }
    };

    if (isOpen) {
      loadPages();
    }
  }, [fs, pagesPath, isOpen]); // addPageToOrderを依存配列から削除

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedItem(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // ドロップ
  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    
    if (draggedItem && draggedItem !== targetPageId) {
      const newOrder = [...pageOrder];
      const draggedIndex = newOrder.indexOf(draggedItem);
      const targetIndex = newOrder.indexOf(targetPageId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // ドラッグされたアイテムを削除
        newOrder.splice(draggedIndex, 1);
        // ターゲットの位置に挿入
        const insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
        newOrder.splice(insertIndex, 0, draggedItem);
        
        updatePageOrder(newOrder);
      }
    }
    
    setDraggedItem(null);
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // ページリストをソート
  const sortedPages = useMemo(() => {
    const sorted: PageInfo[] = [];
    
    // pageOrderに基づいてソート
    for (const pageId of pageOrder) {
      const page = pages.find(p => p.id === pageId);
      if (page) {
        sorted.push(page);
      }
    }
    
    // 順序リストにないページを追加
    for (const page of pages) {
      if (!pageOrder.includes(page.id)) {
        sorted.push(page);
      }
    }
    
    return sorted;
  }, [pages, pageOrder]);

  return (
    <>
      {/* ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 left-4 z-50 p-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg shadow-lg transition-all"
        title="ページ一覧"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* スライドメニュー */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 pt-20 h-full overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">ページ一覧</h2>
          
          <div className="space-y-2">
            {sortedPages.map((page) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, page.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, page.id)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-2 p-3 rounded-lg transition-all cursor-move ${
                  currentPageId === page.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                } ${draggedItem === page.id ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                
                <Link
                  href={`/sessions/${sessionId}/pages/${page.id}/${page.type}`}
                  className="flex-1 text-gray-700 hover:text-gray-900"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="font-medium">{page.name}</div>
                  <div className="text-xs text-gray-500">{page.type}</div>
                </Link>

                {onAddPage && (
                  <button
                    onClick={() => {
                      onAddPage(page.id);
                      setIsOpen(false);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-100 rounded transition-opacity"
                    title="このページの後に新規ページを追加"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {sortedPages.length === 0 && (
            <p className="text-gray-500 text-center mt-8">
              ページがありません
            </p>
          )}
        </div>
      </div>

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}