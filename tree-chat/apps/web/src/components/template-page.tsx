'use client';

import React, { ReactNode } from 'react';
import { BaseTemplate } from './base-template';
import { CanvasCard } from './canvas-card';
import { useParams } from 'next/navigation';

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
  const params = useParams();
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
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
        <div className={`${customStyles}`}>
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 mb-4 text-center">{description}</p>
          )}

          {/* Custom content (e.g., chat component) */}
          {children}

          {/* Template Grid */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: gridLayout.columns,
              gridTemplateRows: gridLayout.rows,
              gridTemplateAreas: gridLayout.areas,
              minHeight: 'calc(100vh - 200px)'
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
          <div className="text-xs text-gray-400 font-mono mt-4">
            Session: {sessionId} | Page: {pageId} | Type: {templateType}
          </div>
        </div>
      )}
    </BaseTemplate>
  );
}