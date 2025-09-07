'use client';

import React, { ReactNode } from 'react';
import { BaseTemplate, BaseTemplateSection } from './base-template';
import { FSTextInput, FSTextarea } from './fs-inputs';
import { TemplateSuggestion } from '@/hooks/use-template-suggestions';
import Link from 'next/link';
import { Home, Lightbulb, Check, X } from 'lucide-react';

// セクションのレンダリング関数の型
export type SectionRenderer<T extends BaseTemplateSection = BaseTemplateSection> = (props: {
  section: T;
  value: string;
  fieldPath: string;
  suggestion?: TemplateSuggestion;
  isLoading: boolean;
  onApplySuggestion?: (suggestion: TemplateSuggestion) => void;
  onDismissSuggestion?: (suggestion: TemplateSuggestion) => void;
}) => ReactNode;

// レイアウトレンダリング関数の型
export type LayoutRenderer<_T extends BaseTemplateSection = BaseTemplateSection> = (props: {
  businessNameInput: ReactNode;
  sections: ReactNode[];
  metadata: {
    sessionName: string;
    pageName: string;
    templateType: string;
  };
}) => ReactNode;

interface TemplateBuilderProps<T extends BaseTemplateSection = BaseTemplateSection> {
  templateName: string;
  templateType: string;
  sections: T[];
  apiEndpoint: string;
  description?: string;
  
  // カスタムレンダリング関数
  renderSection?: SectionRenderer<T>;
  renderLayout?: LayoutRenderer<T>;
  renderBusinessName?: (props: {
    value: string;
    path: string;
    onChange?: (value: string) => void;
  }) => ReactNode;
}

/**
 * デフォルトのセクションレンダラー
 */
export const defaultSectionRenderer: SectionRenderer = ({
  section,
  fieldPath,
  suggestion,
  isLoading,
  onApplySuggestion,
  onDismissSuggestion,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">{section.title}</h3>
    <FSTextarea
      path={fieldPath}
      placeholder={section.placeholder}
      className="flex-1 w-full bg-gray-50 rounded p-2 text-sm resize-none border-0 focus:outline-none"
    />
    {suggestion && (
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <div className="flex items-start gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-xs text-gray-700 flex-1">{suggestion.suggestion}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApplySuggestion?.(suggestion)}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              <Check className="w-3 h-3 inline mr-1" />
              適用
            </button>
            <button
              onClick={() => onDismissSuggestion?.(suggestion)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              <X className="w-3 h-3 inline mr-1" />
              却下
            </button>
          </div>
        </div>
      </div>
    )}
    {isLoading && (
      <div className="mt-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mx-auto" />
      </div>
    )}
  </div>
);

/**
 * デフォルトのレイアウトレンダラー
 */
export const defaultLayoutRenderer: LayoutRenderer = ({
  businessNameInput,
  sections,
  metadata,
}) => (
  <div className="h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto p-4">
    <Link 
      href="/" 
      className="fixed top-4 left-4 z-50 bg-gray-500 hover:bg-gray-600 text-white rounded-full p-2 shadow-lg"
    >
      <Home className="w-4 h-4" />
    </Link>
    
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 text-center">
        {businessNameInput}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections}
      </div>
      
      <div className="text-xs text-gray-400 text-center mt-4">
        Session: {metadata.sessionName} | Page: {metadata.pageName} | Type: {metadata.templateType}
      </div>
    </div>
  </div>
);

/**
 * TemplateBuilder - 柔軟なデザインカスタマイズが可能な中間層
 */
export function TemplateBuilder<T extends BaseTemplateSection = BaseTemplateSection>({
  templateName,
  templateType,
  sections,
  apiEndpoint,
  description = '',
  renderSection = defaultSectionRenderer,
  renderLayout = defaultLayoutRenderer,
  renderBusinessName,
}: TemplateBuilderProps<T>) {
  return (
    <BaseTemplate
      templateName={templateName}
      templateType={templateType}
      sections={sections}
      apiEndpoint={apiEndpoint}
    >
      {(props) => {
        // 事業名入力のレンダリング
        const businessNameInput = renderBusinessName ? (
          renderBusinessName({
            value: props.businessName,
            path: `${props.sharedPath}/business_name`,
            onChange: props.setBusinessName,
          })
        ) : (
          <div>
            <FSTextInput
              path={`${props.sharedPath}/business_name`}
              placeholder="事業名を入力してください"
              className="text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-300 focus:border-blue-500 text-center"
            />
            {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
          </div>
        );

        // 各セクションのレンダリング
        const renderedSections = props.sections.map((section) => {
          const suggestion = props.suggestions.find(s => s.sectionId === section.id);
          
          return (
            <div key={section.id}>
              {renderSection({
                section,
                value: props.templateData[section.id] || '',
                fieldPath: `${props.fieldsPath}/${section.id}`,
                suggestion,
                isLoading: props.isLoading,
                onApplySuggestion: props.applySuggestion,
                onDismissSuggestion: props.dismissSuggestion,
              })}
            </div>
          );
        });

        // レイアウトのレンダリング
        return renderLayout({
          businessNameInput,
          sections: renderedSections,
          metadata: {
            sessionName: props.sessionId,
            pageName: props.pageId,
            templateType,
          },
        });
      }}
    </BaseTemplate>
  );
}