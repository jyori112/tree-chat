'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystem } from '@/lib/data-store';
import { FSTextInput } from '@/components/fs-inputs';
import { useTemplateSuggestions } from '@/hooks/use-template-suggestions';
import { CanvasCard } from '@/components/canvas-card';
import Link from 'next/link';
import { Home } from 'lucide-react';

export interface TemplateSection {
  title: string;
  placeholder: string;
  gridArea: string;
  color: string;
}

interface TemplatePageProps {
  templateName: string;
  templateType: string;
  description: string;
  sections: TemplateSection[];
  apiEndpoint: string;
  gridLayout?: {
    columns: string;
    rows: string;
    areas: string;
  };
  customStyles?: string;
  children?: ReactNode;
}

export function TemplatePage({
  templateName,
  templateType,
  description,
  sections,
  apiEndpoint,
  gridLayout = {
    columns: 'repeat(3, 1fr)',
    rows: 'repeat(3, 1fr)',
    areas: ''
  },
  customStyles = '',
  children
}: TemplatePageProps) {
  const params = useParams();
  const fs = useFileSystem();
  const [businessName, setBusinessName] = useState('');
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
  // パスの定義
  const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
  const fieldsPath = `${pagePath}/fields`;
  const sharedPath = `/sessions/${sessionId}/shared`;
  
  // サジェスト機能
  const { suggestions, isLoading, applySuggestion, dismissSuggestion } = useTemplateSuggestions({
    sessionId,
    pageId,
    businessName,
    templateData,
    apiEndpoint
  });

  // ページ初期化とデータの読み込み
  useEffect(() => {
    const initializePage = async () => {
      try {
        // ページタイプを確認/作成
        const typeExists = await fs.exists(`${pagePath}/type`);
        if (!typeExists) {
          await fs.write(`${pagePath}/type`, templateType);
          await fs.write(`${pagePath}/name`, templateName);
          await fs.write(`${pagePath}/created_at`, new Date().toISOString());
          
          // フィールドディレクトリを作成
          await fs.mkdir(fieldsPath);
          
          // 各フィールドの初期値を作成
          for (const section of sections) {
            await fs.write(`${fieldsPath}/${section.gridArea}`, '');
          }
        }
        
        // 既存データを読み込み
        const loadedData: Record<string, string> = {};
        for (const section of sections) {
          try {
            const value = await fs.read(`${fieldsPath}/${section.gridArea}`);
            loadedData[section.gridArea] = value;
          } catch {
            loadedData[section.gridArea] = '';
          }
        }
        setTemplateData(loadedData);
        
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
  }, [fs, pagePath, fieldsPath, sharedPath, sections, templateType, templateName]);
  
  // データの変更を監視
  useEffect(() => {
    const watchers: (() => void)[] = [];
    
    // 各フィールドを監視
    for (const section of sections) {
      const unwatch = fs.watch(`${fieldsPath}/${section.gridArea}`, async (event) => {
        if (event.type === 'update' || event.type === 'create') {
          try {
            const value = await fs.read(`${fieldsPath}/${section.gridArea}`);
            setTemplateData(prev => ({ ...prev, [section.gridArea]: value }));
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
  }, [fs, fieldsPath, sharedPath, sections]);

  return (
    <div className={`h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden p-4 ${customStyles}`}>
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
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>

      {/* Custom content (e.g., chat component) */}
      {children}

      {/* Template Grid */}
      <div
        className="h-[calc(100vh-160px)] grid gap-4"
        style={{
          gridTemplateColumns: gridLayout.columns,
          gridTemplateRows: gridLayout.rows,
          gridTemplateAreas: gridLayout.areas,
        }}
      >
        {sections.map((section) => {
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
        Session: {sessionId.slice(0, 8)}... | Page: {pageId} | Type: {templateType}
      </div>
    </div>
  );
}