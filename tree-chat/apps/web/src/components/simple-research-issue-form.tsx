'use client';

import React, { useState } from 'react';
import { ResearchIssue } from '@/lib/deep-research-types';
import { Plus, X } from 'lucide-react';

interface SimpleResearchIssueFormProps {
  onSubmit: (issue: ResearchIssue) => void;
  isSubmitting?: boolean;
}

export function SimpleResearchIssueForm({ onSubmit, isSubmitting = false }: SimpleResearchIssueFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    objectives: [''] // 達成状態定義用
  });

  const [showObjectives, setShowObjectives] = useState(false);

  const addObjective = () => {
    setFormData(prev => ({
      ...prev,
      objectives: [...prev.objectives, '']
    }));
  };

  const updateObjective = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.map((obj, i) => i === index ? value : obj)
    }));
  };

  const removeObjective = (index: number) => {
    if (formData.objectives.length > 1) {
      setFormData(prev => ({
        ...prev,
        objectives: prev.objectives.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    if (!formData.description.trim()) {
      alert('課題の説明を入力してください');
      return;
    }

    // Create ResearchIssue with data
    const researchIssue: ResearchIssue = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      background: '',
      objectives: formData.objectives.filter(obj => obj.trim()), // 空でないもののみ
      scope: '',
      constraints: '',
      priority: 'medium',
      tags: []
    };

    onSubmit(researchIssue);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          タイトル
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="調査したい課題のタイトルを入力してください"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          disabled={isSubmitting}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          課題の説明
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="どのような課題について調査したいか、詳しく説明してください"
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          disabled={isSubmitting}
        />
      </div>

      {/* Optional Objectives Section */}
      <div>
        {!showObjectives ? (
          <button
            type="button"
            onClick={() => setShowObjectives(true)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            disabled={isSubmitting}
          >
            <Plus className="w-4 h-4" />
            達成状態の定義を追加 (オプショナル)
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-900">
                達成状態の定義 (オプショナル)
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowObjectives(false);
                  setFormData(prev => ({ ...prev, objectives: [''] }));
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              調査が成功したと言える具体的な状態を定義してください
            </p>
            
            <div className="space-y-3">
              {formData.objectives.map((objective, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    placeholder={`達成状態 ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    disabled={isSubmitting}
                  />
                  {formData.objectives.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeObjective(index)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addObjective}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 text-sm transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4" />
                達成状態を追加
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          )}
          調査を開始
        </button>
      </div>
    </form>
  );
}