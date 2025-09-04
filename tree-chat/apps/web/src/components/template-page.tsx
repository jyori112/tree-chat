'use client';

import React, { ReactNode } from 'react';
import { BaseTemplate } from './base-template';
import { FSTextInput } from './fs-inputs';
import { CanvasCard } from './canvas-card';
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

/**
 * TemplatePage - グリッドレイアウトに特化した最上位層
 * BaseTemplateを使用してロジックを共通化
 */
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
  // sectionsの形式を変換（gridAreaをidとして使用）
  const baseSections = sections.map(section => ({
    id: section.gridArea,
    title: section.title,
    placeholder: section.placeholder,
    gridArea: section.gridArea,
    color: section.color,
  }));

  return (
    <BaseTemplate
      templateName={templateName}
      templateType={templateType}
      sections={baseSections}
      apiEndpoint={apiEndpoint}
    >
      {(props) => (
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
              path={`${props.sharedPath}/business_name`}
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
              const sectionSuggestions = props.suggestions.filter(s => s.sectionId === section.gridArea);
              const suggestion = sectionSuggestions[0];
              
              return (
                <CanvasCard
                  key={section.gridArea}
                  title={section.title}
                  placeholder={section.placeholder}
                  gridArea={section.gridArea}
                  color={section.color}
                  fieldPath={`${props.fieldsPath}/${section.gridArea}`}
                  suggestion={suggestion}
                  isLoading={props.isLoading}
                  onApplySuggestion={props.applySuggestion}
                  onDismissSuggestion={props.dismissSuggestion}
                />
              );
            })}
          </div>

          {/* Debug Info */}
          <div className="fixed bottom-2 left-2 text-xs text-gray-400 font-mono">
            Session: {props.sessionId.slice(0, 8)}... | Page: {props.pageId} | Type: {templateType}
          </div>
        </div>
      )}
    </BaseTemplate>
  );
}