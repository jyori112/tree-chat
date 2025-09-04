'use client';

import React from 'react';
import { FileSystemProvider } from '@/lib/data-store';
import { BaseTemplate } from '@/components/base-template';
import { FSTextInput, FSTextarea } from '@/components/fs-inputs';
import { User, Briefcase, Target, Brain, Heart, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Home } from 'lucide-react';

const personaSections = [
  { id: 'name', title: '名前', placeholder: 'ペルソナの名前' },
  { id: 'age', title: '年齢', placeholder: '年齢層' },
  { id: 'occupation', title: '職業', placeholder: '職業・役職' },
  { id: 'background', title: '背景', placeholder: '生活背景・環境' },
  { id: 'goals', title: '目標', placeholder: '達成したいこと' },
  { id: 'frustrations', title: '課題', placeholder: '抱えている問題・不満' },
  { id: 'motivations', title: '動機', placeholder: '行動の動機・価値観' },
  { id: 'behaviors', title: '行動', placeholder: '日常の行動パターン' },
];

function PersonaAnalysisContent() {
  return (
    <BaseTemplate
      templateName="ペルソナ分析"
      templateType="persona-analysis"
      sections={personaSections}
      apiEndpoint="/api/persona-analysis"
    >
      {(props) => (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {/* Navigation */}
          <Link 
            href="/" 
            className="fixed top-6 left-6 z-50 bg-white hover:bg-gray-100 text-gray-700 rounded-full p-3 shadow-lg transition-all"
          >
            <Home className="w-5 h-5" />
          </Link>

          <div className="container mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">ペルソナ分析</h1>
              <FSTextInput
                path={`${props.sharedPath}/business_name`}
                placeholder="プロジェクト名を入力"
                className="text-2xl bg-transparent border-0 border-b-2 border-indigo-300 focus:border-indigo-500 text-center text-gray-700 placeholder:text-gray-400 px-4 py-2"
              />
            </div>

            {/* Main Persona Card */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Avatar Section */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <User className="w-20 h-20 text-white" />
                    </div>
                    <div className="flex-1">
                      <FSTextInput
                        path={`${props.fieldsPath}/name`}
                        placeholder="ペルソナの名前"
                        className="text-3xl font-bold bg-transparent border-0 text-white placeholder:text-white/70 mb-2"
                      />
                      <div className="flex gap-4">
                        <FSTextInput
                          path={`${props.fieldsPath}/age`}
                          placeholder="年齢"
                          className="bg-white/20 backdrop-blur rounded-lg px-3 py-1 text-white placeholder:text-white/70"
                        />
                        <FSTextInput
                          path={`${props.fieldsPath}/occupation`}
                          placeholder="職業"
                          className="bg-white/20 backdrop-blur rounded-lg px-3 py-1 text-white placeholder:text-white/70 flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Background */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Briefcase className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold">背景・環境</h3>
                      </div>
                      <FSTextarea
                        path={`${props.fieldsPath}/background`}
                        placeholder="生活背景、家族構成、環境など"
                        className="w-full bg-gray-50 rounded-xl p-3 min-h-[120px] border-2 border-transparent focus:border-indigo-300 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Goals */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Target className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold">目標・ゴール</h3>
                      </div>
                      <FSTextarea
                        path={`${props.fieldsPath}/goals`}
                        placeholder="達成したいこと、目指していること"
                        className="w-full bg-gray-50 rounded-xl p-3 min-h-[120px] border-2 border-transparent focus:border-green-300 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Frustrations */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <h3 className="font-semibold">課題・フラストレーション</h3>
                      </div>
                      <FSTextarea
                        path={`${props.fieldsPath}/frustrations`}
                        placeholder="困っていること、不満に感じていること"
                        className="w-full bg-gray-50 rounded-xl p-3 min-h-[120px] border-2 border-transparent focus:border-red-300 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Motivations */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <h3 className="font-semibold">動機・価値観</h3>
                      </div>
                      <FSTextarea
                        path={`${props.fieldsPath}/motivations`}
                        placeholder="大切にしていること、行動の動機"
                        className="w-full bg-gray-50 rounded-xl p-3 min-h-[120px] border-2 border-transparent focus:border-pink-300 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Behaviors - Full Width */}
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Brain className="w-5 h-5 text-purple-500" />
                      <h3 className="font-semibold">行動パターン</h3>
                    </div>
                    <FSTextarea
                      path={`${props.fieldsPath}/behaviors`}
                      placeholder="日常の行動、習慣、利用するサービスやツールなど"
                      className="w-full bg-gray-50 rounded-xl p-3 min-h-[100px] border-2 border-transparent focus:border-purple-300 focus:bg-white transition-all"
                    />
                  </div>

                  {/* AI Suggestions */}
                  {props.suggestions.length > 0 && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                      <h3 className="font-semibold text-gray-700 mb-3">AIからの提案</h3>
                      {props.suggestions.map(suggestion => (
                        <div key={suggestion.sectionId} className="mb-3 last:mb-0">
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>{props.sections.find(s => s.id === suggestion.sectionId)?.title}:</strong> {suggestion.suggestion}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => props.applySuggestion(suggestion)}
                              className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                              適用
                            </button>
                            <button
                              onClick={() => props.dismissSuggestion(suggestion)}
                              className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                              却下
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="text-center mt-8 text-xs text-gray-500">
              Session: {props.sessionId.slice(0, 8)} | Page: {props.pageId} | Type: persona-analysis
            </div>
          </div>
        </div>
      )}
    </BaseTemplate>
  );
}

export default function PersonaAnalysisPage() {
  return (
    <FileSystemProvider>
      <PersonaAnalysisContent />
    </FileSystemProvider>
  );
}