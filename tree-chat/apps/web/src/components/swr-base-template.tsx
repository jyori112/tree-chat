'use client';

import { ReactNode, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useReadFrom, useFileExists } from '@/lib/data-store/swr-hooks';
import { useCommands } from '@/contexts/CommandContext';
import { useTemplateSuggestions, TemplateSuggestion } from '@/hooks/use-template-suggestions';

export interface BaseTemplateSection {
  id: string;
  title: string;
  placeholder?: string;
  [key: string]: any; // カスタムプロパティを許可
}

interface SWRBaseTemplateProps<T extends BaseTemplateSection = BaseTemplateSection> {
  templateName: string;
  templateType: string;
  sections: T[];
  apiEndpoint: string;
  children: (props: {
    businessName: string;
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
    initializePage: () => Promise<void>;
  }) => ReactNode;
}

/**
 * SWR-based BaseTemplate
 * Replaces the complex BaseTemplate with simpler SWR-based data fetching
 */
export function SWRBaseTemplate<T extends BaseTemplateSection = BaseTemplateSection>({
  templateName,
  templateType,
  sections,
  apiEndpoint,
  children,
}: SWRBaseTemplateProps<T>) {
  const params = useParams();
  const { executeCommand } = useCommands();
  
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
  // パスの定義
  const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
  const fieldsPath = `${pagePath}/fields`;
  const sharedPath = `/sessions/${sessionId}/shared`;
  
  // Read data using SWR hooks
  const { data: businessName = '' } = useReadFrom(`${sharedPath}/business_name`, '');
  
  // Read all section data - create a custom hook for this
  const useSectionData = (sections: T[], fieldsPath: string): Record<string, string> => {
    const data: Record<string, string> = {};
    
    // We need to call hooks for each section, but sections array must be stable
    for (const section of sections) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { data: sectionValue = '' } = useReadFrom(`${fieldsPath}/${section.id}`, '');
      data[section.id] = sectionValue;
    }
    
    return data;
  };
  
  const sectionData = useSectionData(sections, fieldsPath);
  
  // Check if page exists using SWR hook at top level
  const { exists: typeExists } = useFileExists(`${pagePath}/type`);
  
  // Initialize page structure
  const initializePage = useCallback(async () => {
    try {
      if (!typeExists) {
        // Create page structure
        await executeCommand({
          type: 'write',
          path: `${pagePath}/type`,
          data: templateType,
          description: `Initialize page type: ${templateType}`
        });
        
        await executeCommand({
          type: 'write',
          path: `${pagePath}/name`,
          data: templateName,
          description: `Set page name: ${templateName}`
        });
        
        await executeCommand({
          type: 'write',
          path: `${pagePath}/created_at`,
          data: new Date().toISOString(),
          description: 'Set creation timestamp'
        });
        
        // Create fields directory
        await executeCommand({
          type: 'mkdir',
          path: fieldsPath,
          description: 'Create fields directory'
        });
        
        // Initialize section fields
        for (const section of sections) {
          await executeCommand({
            type: 'write',
            path: `${fieldsPath}/${section.id}`,
            data: '',
            description: `Initialize field: ${section.id}`
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize page:', error);
    }
  }, [typeExists, executeCommand, pagePath, templateType, templateName, fieldsPath, sections]);
  
  // サジェスト機能
  const { suggestions, isLoading, applySuggestion, dismissSuggestion } = useTemplateSuggestions({
    sessionId,
    pageId,
    businessName,
    templateData: sectionData,
    apiEndpoint
  });

  // すべてのロジックとデータをchildrenに渡す
  return children({
    businessName,
    templateData: sectionData,
    sections,
    suggestions,
    isLoading,
    applySuggestion,
    dismissSuggestion,
    fieldsPath,
    sharedPath,
    sessionId,
    pageId,
    initializePage,
  });
}