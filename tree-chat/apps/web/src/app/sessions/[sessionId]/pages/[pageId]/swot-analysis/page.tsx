'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileSystemProvider, useFileSystem } from '@/lib/data-store';
import { FSTextInput } from '@/components/fs-inputs';
import { useSwotSuggestions } from '@/hooks/use-swot-suggestions';
import { CanvasCard } from '@/components/canvas-card';
import Link from 'next/link';
import { Home } from 'lucide-react';

interface SwotSection {
  title: string;
  placeholder: string;
  gridArea: string;
  color: string;
}

const swotSections: SwotSection[] = [
  {
    title: "強み (Strengths)",
    placeholder: "内部環境の強み・競争優位性",
    gridArea: "strengths",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "弱み (Weaknesses)",
    placeholder: "内部環境の弱み・改善点",
    gridArea: "weaknesses",
    color: "bg-red-50 border-red-300"
  },
  {
    title: "機会 (Opportunities)",
    placeholder: "外部環境の機会・追い風",
    gridArea: "opportunities",
    color: "bg-blue-50 border-blue-300"
  },
  {
    title: "脅威 (Threats)",
    placeholder: "外部環境の脅威・リスク",
    gridArea: "threats",
    color: "bg-yellow-50 border-yellow-300"
  }
];

function SwotAnalysisContent() {
  const params = useParams();
  const fs = useFileSystem();
  const [businessName, setBusinessName] = useState('');
  const [canvasData, setCanvasData] = useState<Record<string, string>>({});
  
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
  // パスの定義
  const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
  const fieldsPath = `${pagePath}/fields`;
  const sharedPath = `/sessions/${sessionId}/shared`;
  
  // SWOT分析専用のサジェスト機能
  const { suggestions, isLoading, applySuggestion, dismissSuggestion } = useSwotSuggestions({
    sessionId,
    pageId,
    businessName,
    canvasData
  });

  // ページ初期化とデータの読み込み
  useEffect(() => {
    const initializePage = async () => {
      try {
        // ページタイプを確認/作成
        const typeExists = await fs.exists(`${pagePath}/type`);
        if (!typeExists) {
          await fs.write(`${pagePath}/type`, 'swot-analysis');
          await fs.write(`${pagePath}/name`, 'SWOT分析');
          await fs.write(`${pagePath}/created_at`, new Date().toISOString());
          
          // フィールドディレクトリを作成
          await fs.mkdir(fieldsPath);
          
          // 各フィールドの初期値を作成
          for (const section of swotSections) {
            await fs.write(`${fieldsPath}/${section.gridArea}`, '');
          }
        }
        
        // 既存データを読み込み
        const loadedData: Record<string, string> = {};
        for (const section of swotSections) {
          try {
            const value = await fs.read(`${fieldsPath}/${section.gridArea}`);
            loadedData[section.gridArea] = value;
          } catch {
            loadedData[section.gridArea] = '';
          }
        }
        setCanvasData(loadedData);
        
        // 事業名を読み込み
        try {
          const name = await fs.read(`${sharedPath}/business_name`);
          setBusinessName(name);
        } catch {
          // 事業名が存在しない場合は無視
        }
      } catch (error) {
        console.error('Failed to initialize page:', error);
      }
    };
    
    initializePage();
  }, [fs, pagePath, fieldsPath, sharedPath]);
  
  // データの変更を監視
  useEffect(() => {
    const watchers: (() => void)[] = [];
    
    // 各フィールドを監視
    for (const section of swotSections) {
      const unwatch = fs.watch(`${fieldsPath}/${section.gridArea}`, async (event) => {
        if (event.type === 'update' || event.type === 'create') {
          try {
            const value = await fs.read(`${fieldsPath}/${section.gridArea}`);
            setCanvasData(prev => ({ ...prev, [section.gridArea]: value }));
          } catch {
            // エラーは無視
          }
        }
      });
      watchers.push(unwatch);
    }
    
    // 事業名を監視
    const unwatchBusinessName = fs.watch(`${sharedPath}/business_name`, async (event) => {
      if (event.type === 'update' || event.type === 'create') {
        try {
          const name = await fs.read(`${sharedPath}/business_name`);
          setBusinessName(name);
        } catch {
          // エラーは無視
        }
      }
    });
    watchers.push(unwatchBusinessName);
    
    return () => {
      watchers.forEach(unwatch => unwatch());
    };
  }, [fs, fieldsPath, sharedPath]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden p-4">
      {/* Navigation - Fixed Position */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 z-50 bg-gray-500 hover:bg-gray-600 text-white rounded-full p-3 shadow-lg transition-colors"
        title="ホームに戻る"
      >
        <Home className="w-5 h-5" />
      </Link>

      {/* Business Name Input */}
      <div className="mb-4 text-center">
        <FSTextInput
          path={`${sharedPath}/business_name`}
          placeholder="事業名を入力してください"
          className="text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none text-center text-gray-800 placeholder:text-gray-400 transition-colors px-4 py-2 min-w-[300px]"
        />
        <p className="text-sm text-gray-600 mt-2">SWOT分析 - 戦略的な強み・弱み・機会・脅威の分析</p>
      </div>

      {/* SWOT Grid - 2x2 Layout */}
      <div
        className="h-[calc(100vh-160px)] grid gap-4"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gridTemplateAreas: `
            "strengths weaknesses"
            "opportunities threats"
          `,
        }}
      >
        {swotSections.map((section) => {
          const sectionSuggestions = suggestions.filter(s => s.sectionId === section.gridArea);
          const suggestion = sectionSuggestions[0];
          
          return (
            <CanvasCard
              key={section.gridArea}
              title={section.title}
              placeholder={section.placeholder}
              gridArea={section.gridArea}
              color={section.color}
              fieldPath={`${fieldsPath}/${section.gridArea}`}
              suggestion={suggestion}
              isLoading={isLoading}
              onApplySuggestion={applySuggestion}
              onDismissSuggestion={dismissSuggestion}
            />
          );
        })}
      </div>

      {/* Debug Info */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400 font-mono">
        Session: {sessionId.slice(0, 8)}... | Page: {pageId} | Type: SWOT
      </div>
    </div>
  );
}

export default function SwotAnalysisPage() {
  return (
    <FileSystemProvider>
      <SwotAnalysisContent />
    </FileSystemProvider>
  );
}