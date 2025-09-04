'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TemplatePage, TemplateSection } from '@/components/template-page';

const swotSections: TemplateSection[] = [
  {
    title: "強み (Strengths)",
    placeholder: "内部環境の強み・競争優位性",
    gridArea: "strengths",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "弱み (Weaknesses)",
    placeholder: "内部環境の弱み・改善点",
    gridArea: "weaknesses",
    color: "bg-red-50 border-red-300"
  },
  {
    title: "機会 (Opportunities)",
    placeholder: "外部環境の機会・追い風",
    gridArea: "opportunities",
    color: "bg-blue-50 border-blue-300"
  },
  {
    title: "脅威 (Threats)",
    placeholder: "外部環境の脅威・リスク",
    gridArea: "threats",
    color: "bg-yellow-50 border-yellow-300"
  }
];

function SwotAnalysisContent() {
  return (
    <TemplatePage
      templateName="SWOT分析"
      templateType="swot-analysis"
      description="SWOT分析 - 戦略的な強み・弱み・機会・脅威の分析"
      sections={swotSections}
      apiEndpoint="/api/swot-analysis"
      gridLayout={{
        columns: "1fr 1fr",
        rows: "1fr 1fr",
        areas: `
          "strengths weaknesses"
          "opportunities threats"
        `,
      }}
    />
  );
}

export default function SwotAnalysisPage() {
  return (
    <FileSystemProvider>
      <SwotAnalysisContent />
    </FileSystemProvider>
  );
}