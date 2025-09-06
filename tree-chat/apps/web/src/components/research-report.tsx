'use client';

import React, { useState } from 'react';
import { ResearchReportProps, ReportFinding, ReportRecommendation } from '@/lib/deep-research-types';
import { 
  FileText, 
  Download, 
  Eye,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Star,
  FileBarChart
} from 'lucide-react';

export function ResearchReportComponent({ report, onExport }: ResearchReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'recommendations' | 'appendices'>('overview');
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());

  if (!report) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileBarChart className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">レポートが生成されていません</h3>
        <p className="text-gray-600">
          リサーチ結果からレポートを生成してください。
        </p>
      </div>
    );
  }

  const toggleFindingExpanded = (id: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFindings(newExpanded);
  };

  const toggleRecommendationExpanded = (id: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecommendations(newExpanded);
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-100';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100';
      case 'low':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'low':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getConfidenceStars = (confidence: number) => {
    const stars = Math.round(confidence * 5);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">{report.title}</h2>
            <div className="flex items-center gap-4 text-sm text-purple-700">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>生成日時: {formatDate(report.generatedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>発見事項: {report.keyFindings.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>推奨事項: {report.recommendations.length}</span>
              </div>
            </div>
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onExport('html')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              HTML
            </button>
            <button
              onClick={() => onExport('markdown')}
              className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              Markdown
            </button>
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '概要', icon: Eye },
            { id: 'findings', label: '発見事項', icon: Lightbulb },
            { id: 'recommendations', label: '推奨事項', icon: Target },
            { id: 'appendices', label: '付録', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">エグゼクティブサマリー</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">{report.executiveSummary}</p>
              </div>
            </div>

            {/* Methodology */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">調査手法</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">{report.methodology}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium">主要な発見事項</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{report.keyFindings.length}</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">推奨事項</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{report.recommendations.length}</div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">制限事項</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{report.limitations.length}</div>
              </div>
            </div>

            {/* Key Conclusions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">主要な結論</h3>
              <div className="space-y-2">
                {report.conclusions.map((conclusion, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-gray-700">{conclusion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Findings Tab */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            {report.keyFindings.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">発見事項がありません</p>
              </div>
            ) : (
              report.keyFindings.map((finding) => {
                const isExpanded = expandedFindings.has(finding.id);
                return (
                  <div key={finding.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleFindingExpanded(finding.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <h4 className="font-semibold text-gray-900">{finding.title}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {getConfidenceStars(finding.confidence)}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(finding.significance)}`}>
                            {finding.significance === 'high' ? '高重要度' : finding.significance === 'medium' ? '中重要度' : '低重要度'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">詳細</h5>
                          <p className="text-gray-700">{finding.description}</p>
                        </div>

                        {finding.evidence.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">エビデンス</h5>
                            <div className="space-y-2">
                              {finding.evidence.map((evidence, index) => (
                                <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">{evidence}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {finding.sources.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">参照ソース ({finding.sources.length})</h5>
                            <div className="space-y-1">
                              {finding.sources.map((source, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                  <span>{source.title}</span>
                                  {source.url && (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="w-3 h-3 text-blue-600" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {report.recommendations.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">推奨事項がありません</p>
              </div>
            ) : (
              report.recommendations.map((recommendation) => {
                const isExpanded = expandedRecommendations.has(recommendation.id);
                return (
                  <div key={recommendation.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleRecommendationExpanded(recommendation.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getPriorityColor(recommendation.priority)}`}>
                            {getPriorityIcon(recommendation.priority)}
                            {recommendation.priority === 'high' ? '高優先度' : recommendation.priority === 'medium' ? '中優先度' : '低優先度'}
                          </span>
                          <span className="text-xs text-gray-500">{recommendation.timeline}</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">詳細</h5>
                          <p className="text-gray-700">{recommendation.description}</p>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">根拠</h5>
                          <p className="text-gray-700">{recommendation.rationale}</p>
                        </div>

                        {recommendation.resources && recommendation.resources.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">必要リソース</h5>
                            <div className="space-y-1">
                              {recommendation.resources.map((resource, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                  <ArrowRight className="w-3 h-3" />
                                  <span>{resource}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {recommendation.risks && recommendation.risks.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">リスク・考慮事項</h5>
                            <div className="space-y-1">
                              {recommendation.risks.map((risk, index) => (
                                <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-700">{risk}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Appendices Tab */}
        {activeTab === 'appendices' && (
          <div className="space-y-6">
            {/* Limitations */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">制限事項</h3>
              <div className="space-y-2">
                {report.limitations.map((limitation, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{limitation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            {report.nextSteps && report.nextSteps.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">今後のステップ</h3>
                <div className="space-y-2">
                  {report.nextSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Appendices */}
            {report.appendices && report.appendices.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">追加資料</h3>
                <div className="space-y-4">
                  {report.appendices.map((appendix) => (
                    <div key={appendix.id} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{appendix.title}</h4>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">
                          {appendix.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}