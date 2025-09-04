'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TemplatePage, TemplateSection } from '@/components/template-page';

const canvasSections: TemplateSection[] = [
  {
    title: "課題",
    placeholder: "顧客が抱える上位3つの課題",
    gridArea: "problem",
    color: "bg-white border-gray-200",
  },
  {
    title: "解決策",
    placeholder: "課題に対する解決策",
    gridArea: "solution",
    color: "bg-white border-gray-200",
  },
  {
    title: "主要指標",
    placeholder: "成功を測る指標",
    gridArea: "metrics",
    color: "bg-white border-gray-200",
  },
  {
    title: "価値提案",
    placeholder: "独自の価値・メリット",
    gridArea: "uvp",
    color: "bg-white border-gray-200",
  },
  {
    title: "優位性",
    placeholder: "競合との差別化要素",
    gridArea: "advantage",
    color: "bg-white border-gray-200",
  },
  {
    title: "チャネル",
    placeholder: "顧客へのアプローチ方法",
    gridArea: "channel",
    color: "bg-white border-gray-200",
  },
  {
    title: "顧客",
    placeholder: "ターゲット顧客層",
    gridArea: "customer",
    color: "bg-white border-gray-200",
  },
  {
    title: "コスト構造",
    placeholder: "主要なコスト",
    gridArea: "cost",
    color: "bg-white border-gray-200",
  },
  {
    title: "収益",
    placeholder: "収益モデル・価格戦略",
    gridArea: "revenue",
    color: "bg-white border-gray-200",
  },
];

function LeanCanvasContent() {
  return (
    <TemplatePage
      templateName="リーンキャンバス"
      templateType="lean-canvas"
      description="Lean Canvas - ビジネスモデルを1枚にまとめる"
      sections={canvasSections}
      apiEndpoint="/api/lean-canvas"
      gridLayout={{
        columns: "repeat(5, 1fr)",
        rows: "repeat(3, 1fr)",
        areas: `
          "problem solution metrics uvp advantage"
          "problem solution metrics uvp channel"
          "customer customer cost revenue revenue"
        `,
      }}
    />
  );
}

export default function LeanCanvasPage() {
  return (
    <FileSystemProvider>
      <LeanCanvasContent />
    </FileSystemProvider>
  );
}