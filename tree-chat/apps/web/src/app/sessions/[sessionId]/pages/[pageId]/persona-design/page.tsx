'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { TemplatePage, TemplateSection } from '@/components/template-page';

const personaDesignSections: TemplateSection[] = [
  {
    title: "基本情報",
    placeholder: "年齢、性別、職業、居住地",
    gridArea: "basicInfo",
    color: "bg-blue-50 border-blue-300"
  },
  {
    title: "背景・経歴",
    placeholder: "学歴、職歴、経験",
    gridArea: "background",
    color: "bg-gray-50 border-gray-300"
  },
  {
    title: "目標・ゴール",
    placeholder: "達成したいこと、人生の目標",
    gridArea: "goals",
    color: "bg-green-50 border-green-300"
  },
  {
    title: "悩み・フラストレーション",
    placeholder: "日常的な不満、解決したい課題",
    gridArea: "frustrations",
    color: "bg-red-50 border-red-300"
  },
  {
    title: "価値観",
    placeholder: "大切にしていること、判断基準",
    gridArea: "values",
    color: "bg-purple-50 border-purple-300"
  },
  {
    title: "1日の過ごし方",
    placeholder: "典型的なスケジュール",
    gridArea: "dayInLife",
    color: "bg-yellow-50 border-yellow-300"
  },
  {
    title: "タッチポイント",
    placeholder: "情報収集や購買の接点",
    gridArea: "touchpoints",
    color: "bg-orange-50 border-orange-300"
  },
  {
    title: "意思決定要因",
    placeholder: "購買や選択の判断基準",
    gridArea: "decisionFactors",
    color: "bg-indigo-50 border-indigo-300"
  },
  {
    title: "製品・サービスとの関係",
    placeholder: "利用シーン、期待する価値",
    gridArea: "relationToProduct",
    color: "bg-emerald-50 border-emerald-300"
  }
];

function PersonaDesignContent() {
  return (
    <TemplatePage
      templateName="ペルソナ設定"
      templateType="persona-design"
      description="Persona Design - ターゲット顧客の詳細な人物像を設定"
      sections={personaDesignSections}
      apiEndpoint="/api/persona-design"
      gridLayout={{
        columns: "repeat(3, 1fr)",
        rows: "repeat(3, 1fr)",
        areas: `
          "basicInfo background goals"
          "frustrations values dayInLife"
          "touchpoints decisionFactors relationToProduct"
        `,
      }}
    />
  );
}

export default function PersonaDesignPage() {
  return (
    <FileSystemProvider>
      <PersonaDesignContent />
    </FileSystemProvider>
  );
}