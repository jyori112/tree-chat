'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageOrder } from '@/hooks/use-page-order';
import { useFileSystem } from '@/lib/data-store';

interface PageNavigationProps {
  sessionId: string;
  currentPageId: string;
}

export function PageNavigation({ sessionId, currentPageId }: PageNavigationProps) {
  const router = useRouter();
  const fs = useFileSystem();
  const { getNextPageId, getPrevPageId } = usePageOrder(sessionId);
  const [nextPageType, setNextPageType] = useState<string | null>(null);
  const [prevPageType, setPrevPageType] = useState<string | null>(null);

  const nextPageId = getNextPageId(currentPageId);
  const prevPageId = getPrevPageId(currentPageId);

  // ページタイプの取得
  useEffect(() => {
    const loadPageTypes = async () => {
      if (nextPageId) {
        try {
          const type = await fs.read(`/sessions/${sessionId}/pages/${nextPageId}/type`);
          setNextPageType(type);
        } catch {
          setNextPageType(null);
        }
      } else {
        setNextPageType(null);
      }

      if (prevPageId) {
        try {
          const type = await fs.read(`/sessions/${sessionId}/pages/${prevPageId}/type`);
          setPrevPageType(type);
        } catch {
          setPrevPageType(null);
        }
      } else {
        setPrevPageType(null);
      }
    };

    loadPageTypes();
  }, [fs, sessionId, nextPageId, prevPageId]);

  const navigateToPrev = () => {
    if (prevPageId && prevPageType) {
      router.push(`/sessions/${sessionId}/pages/${prevPageId}/${prevPageType}`);
    }
  };

  const navigateToNext = () => {
    if (nextPageId && nextPageType) {
      router.push(`/sessions/${sessionId}/pages/${nextPageId}/${nextPageType}`);
    }
  };

  return (
    <>
      {/* 左側のマージンクリック領域 */}
      {prevPageId && prevPageType && (
        <div
          onClick={navigateToPrev}
          className="fixed left-0 top-0 w-20 h-full z-20 cursor-pointer group"
          title="前のページへ"
        >
          {/* ホバー時の視覚的フィードバック */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* 矢印アイコン */}
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 group-hover:bg-white text-gray-700 rounded-full p-3 shadow-lg transition-all group-hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* 右側のマージンクリック領域 */}
      {nextPageId && nextPageType && (
        <div
          onClick={navigateToNext}
          className="fixed right-0 top-0 w-20 h-full z-20 cursor-pointer group"
          title="次のページへ"
        >
          {/* ホバー時の視覚的フィードバック */}
          <div className="absolute inset-0 bg-gradient-to-l from-gray-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* 矢印アイコン */}
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 group-hover:bg-white text-gray-700 rounded-full p-3 shadow-lg transition-all group-hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}