'use client';

import { useState, useEffect } from 'react';
import { useFileSystem } from '@/lib/data-store';

export interface PageOrderItem {
  id: string;
  name: string;
  type: string;
}

export function usePageOrder(sessionId: string) {
  const fs = useFileSystem();
  const [pageOrder, setPageOrder] = useState<string[]>([]);
  const orderPath = `/sessions/${sessionId}/page_order`;

  // ページ順序の読み込み
  useEffect(() => {
    const loadPageOrder = async () => {
      try {
        const orderData = await fs.read(orderPath);
        const order = JSON.parse(orderData);
        setPageOrder(order);
      } catch {
        // ファイルが存在しない場合は空配列
        setPageOrder([]);
      }
    };

    loadPageOrder();

    // ファイルの変更を監視
    const unwatch = fs.watch(orderPath, async (event) => {
      if (event.type === 'update' || event.type === 'create') {
        try {
          const orderData = await fs.read(orderPath);
          const order = JSON.parse(orderData);
          setPageOrder(order);
        } catch {
          setPageOrder([]);
        }
      } else if (event.type === 'delete') {
        setPageOrder([]);
      }
    });

    return unwatch;
  }, [fs, orderPath]);

  // ページ順序の更新
  const updatePageOrder = async (newOrder: string[]) => {
    try {
      await fs.write(orderPath, JSON.stringify(newOrder));
      setPageOrder(newOrder);
    } catch (error) {
      console.error('Failed to update page order:', error);
    }
  };

  // 新しいページを特定の位置に追加
  const addPageToOrder = async (pageId: string, afterPageId?: string) => {
    const newOrder = [...pageOrder];
    
    if (!newOrder.includes(pageId)) {
      if (afterPageId) {
        const index = newOrder.indexOf(afterPageId);
        if (index !== -1) {
          newOrder.splice(index + 1, 0, pageId);
        } else {
          newOrder.push(pageId);
        }
      } else {
        newOrder.push(pageId);
      }
      
      await updatePageOrder(newOrder);
    }
  };

  // ページを順序から削除
  const removePageFromOrder = async (pageId: string) => {
    const newOrder = pageOrder.filter(id => id !== pageId);
    await updatePageOrder(newOrder);
  };

  // 次のページIDを取得
  const getNextPageId = (currentPageId: string): string | null => {
    const index = pageOrder.indexOf(currentPageId);
    if (index !== -1 && index < pageOrder.length - 1) {
      return pageOrder[index + 1];
    }
    return null;
  };

  // 前のページIDを取得
  const getPrevPageId = (currentPageId: string): string | null => {
    const index = pageOrder.indexOf(currentPageId);
    if (index > 0) {
      return pageOrder[index - 1];
    }
    return null;
  };

  return {
    pageOrder,
    updatePageOrder,
    addPageToOrder,
    removePageFromOrder,
    getNextPageId,
    getPrevPageId
  };
}