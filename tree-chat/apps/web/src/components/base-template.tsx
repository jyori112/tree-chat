'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystem } from '@/lib/data-store';
import { useTemplateSuggestions, TemplateSuggestion } from '@/hooks/use-template-suggestions';

export interface BaseTemplateSection {
  id: string;
  title: string;
  placeholder?: string;
  [key: string]: any; // カスタムプロパティを許可
}

interface BaseTemplateProps<T extends BaseTemplateSection = BaseTemplateSection> {
  templateName: string;
  templateType: string;
  sections: T[];
  apiEndpoint: string;
  children: (props: {
    businessName: string;
    setBusinessName: (name: string) => void;
    templateData: Record<string, string>;
    sections: T[];
    suggestions: TemplateSuggestion[];
    isLoading: boolean;
    applySuggestion: (suggestion: TemplateSuggestion) => void;
    dismissSuggestion: (suggestion: TemplateSuggestion) => void;
    fieldsPath: string;
    sharedPath: string;
    sessionId: string;
    pageId: string;
  }) => ReactNode;
}

/**
 * BaseTemplate - ロジック層の共通化
 * 
 * このコンポーネントは以下を提供：
 * - FileSystemの初期化と監視
 * - サジェスト機能の統合
 * - データの読み込みと同期
 * 
 * UIの実装は完全にchildren関数に委譲
 */
export function BaseTemplate<T extends BaseTemplateSection = BaseTemplateSection>({
  templateName,
  templateType,
  sections,
  apiEndpoint,
  children,
}: BaseTemplateProps<T>) {
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
    sessionId: sessionId,
    pageId: pageId,
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
            await fs.write(`${fieldsPath}/${section.id}`, '');
          }
        }
        
        // 既存データを読み込み
        const loadedData: Record<string, string> = {};
        for (const section of sections) {
          try {
            const value = await fs.read(`${fieldsPath}/${section.id}`);
            loadedData[section.id] = value;
          } catch {
            loadedData[section.id] = '';
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
      const unwatch = fs.watch(`${fieldsPath}/${section.id}`, async (event) => {
        if (event.type === 'update' || event.type === 'create') {
          try {
            const value = await fs.read(`${fieldsPath}/${section.id}`);
            setTemplateData(prev => ({ ...prev, [section.id]: value }));
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

  // すべてのロジックとデータをchildrenに渡す
  return children({
    businessName,
    setBusinessName,
    templateData,
    sections,
    suggestions,
    isLoading,
    applySuggestion,
    dismissSuggestion,
    fieldsPath,
    sharedPath,
    sessionId,
    pageId,
  });
}