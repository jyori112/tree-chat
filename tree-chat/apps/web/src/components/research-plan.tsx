'use client';

import React from 'react';
import { ResearchPlanProps, ResearchStatus } from '@/lib/deep-research-types';
import { 
  Play, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Loader2,
  AlertCircle,
  ArrowRight,
  Users,
  BookOpen
} from 'lucide-react';

export function ResearchPlan({ plan, onStartResearch, isExecuting = false }: ResearchPlanProps) {
  const getStatusIcon = (status: ResearchStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'researching':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ResearchStatus) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">完了</span>;
      case 'researching':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">実行中</span>;
      case 'error':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">エラー</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">待機中</span>;
    }
  };

  const getMethodIcon = (method: string) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('web') || lowerMethod.includes('search')) {
      return <BookOpen className="w-4 h-4 text-blue-500" />;
    }
    if (lowerMethod.includes('interview') || lowerMethod.includes('survey')) {
      return <Users className="w-4 h-4 text-purple-500" />;
    }
    return <BookOpen className="w-4 h-4 text-gray-500" />;
  };

  const completedSteps = plan.filter(step => step.status === 'completed').length;
  const totalSteps = plan.length;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Show plan generation if no plan exists
  if (plan.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">リサーチ計画を生成中...</h3>
            <p className="text-gray-600">
              AIが最適なリサーチ計画を策定しています。少々お待ちください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900">リサーチ計画</h3>
          <div className="text-right">
            <div className="text-sm text-blue-700">
              進捗: {completedSteps}/{totalSteps} ステップ
            </div>
            <div className="text-xs text-blue-600">
              {progressPercentage}% 完了
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
          <div 
            className="h-2 bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Action Button */}
        {!isExecuting && completedSteps < totalSteps && (
          <button
            onClick={onStartResearch}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            リサーチを開始
          </button>
        )}

        {isExecuting && (
          <div className="flex items-center gap-2 text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">リサーチを実行中...</span>
          </div>
        )}
      </div>

      {/* Plan Steps */}
      <div className="space-y-4">
        {plan.map((step, index) => {
          const isActive = step.status === 'researching';
          const isCompleted = step.status === 'completed';
          const hasResult = step.result && step.result.trim().length > 0;

          return (
            <div 
              key={step.id}
              className={`border rounded-lg p-4 transition-all ${
                isActive 
                  ? 'border-blue-300 bg-blue-50' 
                  : isCompleted
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-start gap-4">
                {/* Connection Line */}
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>
                  {index < plan.length - 1 && (
                    <div 
                      className={`w-0.5 h-8 mt-2 ${
                        isCompleted ? 'bg-green-300' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  {/* Title and Status */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>Step {index + 1}:</span>
                      {step.title}
                    </h4>
                    {getStatusBadge(step.status)}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-3">
                    {step.description}
                  </p>

                  {/* Method and Time */}
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      {getMethodIcon(step.method)}
                      <span>手法: {step.method}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>予想時間: {step.estimatedTime}</span>
                    </div>
                  </div>

                  {/* Dependencies */}
                  {step.dependencies && step.dependencies.length > 0 && (
                    <div className="text-sm text-gray-500 mb-3">
                      <span className="font-medium">依存関係:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {step.dependencies.map((depId, depIndex) => {
                          const depStep = plan.find(s => s.id === depId);
                          return (
                            <React.Fragment key={depId}>
                              {depIndex > 0 && <ArrowRight className="w-3 h-3" />}
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {depStep?.title || depId}
                              </span>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Result Preview */}
                  {hasResult && (
                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">結果サマリー</h5>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {step.result}
                      </p>
                    </div>
                  )}

                  {/* Active Step Indicator */}
                  {isActive && (
                    <div className="mt-3 flex items-center gap-2 text-blue-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">このステップを実行中...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {totalSteps > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              合計 {totalSteps} ステップ
            </span>
            <div className="flex items-center gap-4">
              <span className="text-green-600">
                ✓ {completedSteps} 完了
              </span>
              <span className="text-gray-500">
                ⏳ {totalSteps - completedSteps} 残り
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}