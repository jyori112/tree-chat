'use client';

import React, { useState } from 'react';
import { ResearchResultsProps, ResearchResult, ResearchSource } from '@/lib/deep-research-types';
import { 
  FileText, 
  ExternalLink, 
  Star,
  Calendar,
  User,
  Globe,
  Database,
  FileImage,
  MessageSquare,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  FileBarChart
} from 'lucide-react';

export function ResearchResults({ results, onGenerateReport }: ResearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const getSourceIcon = (type: ResearchSource['type']) => {
    switch (type) {
      case 'web':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'database':
        return <Database className="w-4 h-4 text-purple-500" />;
      case 'interview':
        return <MessageSquare className="w-4 h-4 text-orange-500" />;
      case 'survey':
        return <BarChart3 className="w-4 h-4 text-red-500" />;
      default:
        return <FileImage className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceTypeLabel = (type: ResearchSource['type']) => {
    switch (type) {
      case 'web': return 'Webサイト';
      case 'document': return 'ドキュメント';
      case 'database': return 'データベース';
      case 'interview': return 'インタビュー';
      case 'survey': return 'アンケート';
      default: return '不明';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRelevanceStars = (relevance: number) => {
    const stars = Math.round(relevance * 5);
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">リサーチ結果がありません</h3>
        <p className="text-gray-600">
          リサーチが完了すると、結果がここに表示されます。
        </p>
      </div>
    );
  }

  const totalSources = results.reduce((acc, result) => acc + result.sources.length, 0);
  const averageConfidence = results.reduce((acc, result) => acc + result.confidence, 0) / results.length;
  const totalInsights = results.reduce((acc, result) => acc + result.insights.length, 0);

  return (
    <div className="space-y-6">
      {/* Results Overview */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-900">リサーチ結果サマリー</h3>
          <button
            onClick={onGenerateReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileBarChart className="w-4 h-4" />
            レポートを生成
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-700">完了ステップ</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{results.length}</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-700">情報ソース</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalSources}</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-gray-700">洞察</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalInsights}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-green-700">
              平均信頼度: {Math.round(averageConfidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Individual Results */}
      <div className="space-y-4">
        {results.map((result) => {
          const isExpanded = expandedResults.has(result.stepId);
          
          return (
            <div key={result.stepId} className="border rounded-lg overflow-hidden">
              {/* Result Header */}
              <div 
                className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpanded(result.stepId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <h4 className="font-semibold text-gray-900">{result.title}</h4>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                      信頼度 {Math.round(result.confidence * 100)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(result.timestamp)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Main Content */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">詳細内容</h5>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700">
                        {result.content}
                      </div>
                    </div>
                  </div>

                  {/* Key Insights */}
                  {result.insights.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600" />
                        主要な洞察
                      </h5>
                      <div className="space-y-2">
                        {result.insights.map((insight, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  {result.sources.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">情報ソース ({result.sources.length})</h5>
                      <div className="space-y-3">
                        {result.sources.map((source, index) => (
                          <div key={index} className="p-3 bg-gray-50 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getSourceIcon(source.type)}
                                <span className="font-medium text-gray-900">{source.title}</span>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  {getSourceTypeLabel(source.type)}
                                </span>
                              </div>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                              {source.author && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{source.author}</span>
                                </div>
                              )}
                              {source.publishDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(source.publishDate).toLocaleDateString('ja-JP')}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span>関連度:</span>
                                <div className="flex">
                                  {getRelevanceStars(source.relevance)}
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-600 italic">
                              "{source.excerpt}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}