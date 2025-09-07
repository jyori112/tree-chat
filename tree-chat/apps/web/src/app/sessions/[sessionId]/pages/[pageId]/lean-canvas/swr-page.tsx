'use client';

import React, { useEffect } from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { CommandProvider } from '@/contexts/CommandContext';
import { SWRConfig } from 'swr';
import { SWRBaseTemplate } from '@/components/swr-base-template';
import { SWRCanvasCard } from '@/components/swr-canvas-card';

const canvasSections = [
  {
    title: "課題",
    placeholder: "顧客が抱える上位3つの課題",
    gridArea: "problem",
    color: "bg-white border-gray-200",
    id: "problem"
  },
  {
    title: "解決策",
    placeholder: "課題に対する解決策",
    gridArea: "solution",
    color: "bg-white border-gray-200",
    id: "solution"
  },
  {
    title: "主要指標",
    placeholder: "成功を測る指標",
    gridArea: "metrics",
    color: "bg-white border-gray-200",
    id: "metrics"
  },
  {
    title: "価値提案",
    placeholder: "独自の価値・メリット",
    gridArea: "uvp",
    color: "bg-white border-gray-200",
    id: "uvp"
  },
  {
    title: "優位性",
    placeholder: "競合との差別化要素",
    gridArea: "advantage",
    color: "bg-white border-gray-200",
    id: "advantage"
  },
  {
    title: "チャネル",
    placeholder: "顧客へのアプローチ方法",
    gridArea: "channel",
    color: "bg-white border-gray-200",
    id: "channel"
  },
  {
    title: "顧客",
    placeholder: "ターゲット顧客層",
    gridArea: "customer",
    color: "bg-white border-gray-200",
    id: "customer"
  },
  {
    title: "コスト構造",
    placeholder: "主要なコスト",
    gridArea: "cost",
    color: "bg-white border-gray-200",
    id: "cost"
  },
  {
    title: "収益",
    placeholder: "収益モデル・価格戦略",
    gridArea: "revenue",
    color: "bg-white border-gray-200",
    id: "revenue"
  },
];

function SWRLeanCanvasContent() {
  return (
    <SWRBaseTemplate
      templateName="リーンキャンバス"
      templateType="lean-canvas"
      sections={canvasSections}
      apiEndpoint="/api/lean-canvas"
    >
      {(props) => {
        // Initialize page on mount
        useEffect(() => {
          props.initializePage();
        }, [props.initializePage]);

        return (
          <div className="max-w-7xl mx-auto">
            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 text-center">
              Lean Canvas - ビジネスモデルを1枚にまとめる
            </p>

            {/* Template Grid */}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(5, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
                gridTemplateAreas: `
                  "problem solution metrics uvp advantage"
                  "problem solution metrics uvp channel"
                  "customer customer cost revenue revenue"
                `,
                minHeight: 'calc(100vh - 200px)'
              }}
            >
              {canvasSections.map((section) => {
                const sectionSuggestions = props.suggestions.filter(s => s.sectionId === section.id);
                const suggestion = sectionSuggestions[0];
                
                return (
                  <SWRCanvasCard
                    key={section.id}
                    title={section.title}
                    placeholder={section.placeholder}
                    gridArea={section.gridArea}
                    color={section.color}
                    fieldPath={`${props.fieldsPath}/${section.id}`}
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
              Session: {props.sessionId} | Page: {props.pageId} | Type: lean-canvas (SWR)
            </div>
          </div>
        );
      }}
    </SWRBaseTemplate>
  );
}

export default function SWRLeanCanvasPage() {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshInterval: 0,
        errorRetryCount: 1,
      }}
    >
      <FileSystemProvider>
        <CommandProvider>
          <SWRLeanCanvasContent />
        </CommandProvider>
      </FileSystemProvider>
    </SWRConfig>
  );
}