'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TemplatePage, TemplateSection } from '@/components/template-page';

const threeCAnalysisSections: TemplateSection[] = [
  {
    title: "顧客（Customer）",
    placeholder: "顧客のニーズ、市場規模、購買行動",
    gridArea: "customer",
    color: "bg-blue-50 border-blue-300"
  },
  {
    title: "競合（Competitor）",
    placeholder: "競合他社の戦略、強み・弱み",
    gridArea: "competitor",
    color: "bg-red-50 border-red-300"
  },
  {
    title: "自社（Company）",
    placeholder: "自社の強み・弱み、経営資源",
    gridArea: "company",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "戦略的示唆",
    placeholder: "3C分析から導かれる戦略",
    gridArea: "strategy",
    color: "bg-purple-50 border-purple-300"
  }
];

function ThreeCAnalysisContent() {
  return (
    <TemplatePage
      templateName="3C分析"
      templateType="3c-analysis"
      description="3C分析 - 顧客・競合・自社の3つの視点から戦略を分析"
      sections={threeCAnalysisSections}
      apiEndpoint="/api/3c-analysis"
      gridLayout={{
        columns: "1fr 1fr",
        rows: "1fr 1fr",
        areas: `
          "customer competitor"
          "company strategy"
        `,
      }}
    />
  );
}

export default function ThreeCAnalysisPage() {
  return (
    <FileSystemProvider>
      <ThreeCAnalysisContent />
    </FileSystemProvider>
  );
}