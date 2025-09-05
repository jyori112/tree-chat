'use client';

import React from 'react';
import { FileText, Target, Grid3X3, BarChart3, Lightbulb, User } from 'lucide-react';

export interface PageTemplate {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const pageTemplates: PageTemplate[] = [
  {
    type: 'lean-canvas',
    name: 'リーンキャンバス',
    description: 'ビジネスモデルを1枚で可視化',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    type: 'swot-analysis',
    name: 'SWOT分析',
    description: '強み・弱み・機会・脅威を分析',
    icon: <Target className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    type: 'business-model-canvas',
    name: 'ビジネスモデルキャンバス',
    description: 'ビジネスモデルを9つの要素で整理',
    icon: <Grid3X3 className="w-6 h-6" />,
    color: 'bg-indigo-100 text-indigo-600'
  },
  {
    type: '3c-analysis',
    name: '3C分析',
    description: '顧客・競合・自社の3つの視点で分析',
    icon: <BarChart3 className="w-6 h-6" />,
    color: 'bg-orange-100 text-orange-600'
  },
  {
    type: 'value-proposition-canvas',
    name: 'バリュープロポジションキャンバス',
    description: '顧客ニーズと提供価値のフィット',
    icon: <Lightbulb className="w-6 h-6" />,
    color: 'bg-yellow-100 text-yellow-600'
  },
  {
    type: 'persona-design',
    name: 'ペルソナ設定',
    description: 'ターゲット顧客の詳細な人物像',
    icon: <User className="w-6 h-6" />,
    color: 'bg-green-100 text-green-600'
  }
];

interface CreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePage: (templateType: string) => Promise<void>;
}

export function CreatePageModal({ isOpen, onClose, onCreatePage }: CreatePageModalProps) {
  if (!isOpen) return null;

  const handleCreatePage = async (templateType: string) => {
    await onCreatePage(templateType);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          テンプレートを選択
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {pageTemplates.map((template) => (
            <button
              key={template.type}
              onClick={() => handleCreatePage(template.type)}
              className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${template.color}`}>
                  {template.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

export { pageTemplates };