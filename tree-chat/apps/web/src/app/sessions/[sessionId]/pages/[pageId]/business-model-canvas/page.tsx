'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TemplatePage, TemplateSection } from '@/components/template-page';

const businessModelSections: TemplateSection[] = [
  {
    title: "主要パートナー",
    placeholder: "ビジネスを支える外部パートナー",
    gridArea: "keyPartners",
    color: "bg-blue-50 border-blue-300"
  },
  {
    title: "主要活動",
    placeholder: "価値を生み出すために必要な活動",
    gridArea: "keyActivities",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "主要リソース",
    placeholder: "ビジネスに必要な経営資源",
    gridArea: "keyResources",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "価値提案",
    placeholder: "顧客に提供する独自の価値",
    gridArea: "valuePropositions",
    color: "bg-purple-50 border-purple-300"
  },
  {
    title: "顧客との関係",
    placeholder: "顧客との関係性の構築方法",
    gridArea: "customerRelationships",
    color: "bg-yellow-50 border-yellow-300"
  },
  {
    title: "チャネル",
    placeholder: "顧客への価値の届け方",
    gridArea: "channels",
    color: "bg-yellow-50 border-yellow-300"
  },
  {
    title: "顧客セグメント",
    placeholder: "ターゲットとなる顧客層",
    gridArea: "customerSegments",
    color: "bg-orange-50 border-orange-300"
  },
  {
    title: "コスト構造",
    placeholder: "ビジネスの主要コスト",
    gridArea: "costStructure",
    color: "bg-red-50 border-red-300"
  },
  {
    title: "収益の流れ",
    placeholder: "収益化の方法",
    gridArea: "revenueStreams",
    color: "bg-emerald-50 border-emerald-300"
  }
];

function BusinessModelCanvasContent() {
  return (
    <TemplatePage
      templateName="ビジネスモデルキャンバス"
      templateType="business-model-canvas"
      description="Business Model Canvas - ビジネスモデル全体を9つの要素で可視化"
      sections={businessModelSections}
      apiEndpoint="/api/business-model-canvas"
      gridLayout={{
        columns: "repeat(5, 1fr)",
        rows: "repeat(3, 1fr)",
        areas: `
          "keyPartners keyActivities valuePropositions customerRelationships customerSegments"
          "keyPartners keyResources valuePropositions channels customerSegments"
          "costStructure costStructure costStructure revenueStreams revenueStreams"
        `,
      }}
    />
  );
}

export default function BusinessModelCanvasPage() {
  return (
    <FileSystemProvider>
      <BusinessModelCanvasContent />
    </FileSystemProvider>
  );
}