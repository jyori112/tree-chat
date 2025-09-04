'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TemplatePage, TemplateSection } from '@/components/template-page';

const valuePropositionSections: TemplateSection[] = [
  {
    title: "顧客の仕事",
    placeholder: "顧客が達成したいこと、解決したい問題",
    gridArea: "customerJobs",
    color: "bg-orange-50 border-orange-300"
  },
  {
    title: "顧客の痛み",
    placeholder: "不満、リスク、障害",
    gridArea: "customerPains",
    color: "bg-red-50 border-red-300"
  },
  {
    title: "顧客の利得",
    placeholder: "求める成果、期待を超える価値",
    gridArea: "customerGains",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "製品・サービス",
    placeholder: "提供する製品やサービス",
    gridArea: "productsServices",
    color: "bg-blue-50 border-blue-300"
  },
  {
    title: "ペインリリーバー",
    placeholder: "顧客の痛みを和らげる方法",
    gridArea: "painRelievers",
    color: "bg-yellow-50 border-yellow-300"
  },
  {
    title: "ゲインクリエーター",
    placeholder: "顧客に利得をもたらす方法",
    gridArea: "gainCreators",
    color: "bg-purple-50 border-purple-300"
  },
  {
    title: "フィット評価",
    placeholder: "顧客ニーズと価値提案のマッチング",
    gridArea: "fitAssessment",
    color: "bg-indigo-50 border-indigo-300"
  }
];

function ValuePropositionCanvasContent() {
  return (
    <TemplatePage
      templateName="バリュープロポジションキャンバス"
      templateType="value-proposition-canvas"
      description="Value Proposition Canvas - 顧客のニーズと提供価値のフィットを可視化"
      sections={valuePropositionSections}
      apiEndpoint="/api/value-proposition-canvas"
      gridLayout={{
        columns: "repeat(3, 1fr)",
        rows: "repeat(3, 1fr)",
        areas: `
          "customerJobs customerJobs productsServices"
          "customerPains customerGains painRelievers"
          "fitAssessment fitAssessment gainCreators"
        `,
      }}
    />
  );
}

export default function ValuePropositionCanvasPage() {
  return (
    <FileSystemProvider>
      <ValuePropositionCanvasContent />
    </FileSystemProvider>
  );
}