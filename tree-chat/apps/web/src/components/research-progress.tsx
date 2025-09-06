'use client';

import React from 'react';
import { ResearchProgressProps, ResearchStatus } from '@/lib/deep-research-types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  PlayCircle,
  Loader2
} from 'lucide-react';

export function ResearchProgress({ stages, currentStageId }: ResearchProgressProps) {
  const getStatusIcon = (status: ResearchStatus, isActive: boolean) => {
    const iconClass = `w-6 h-6 ${isActive ? '' : 'opacity-60'}`;
    
    switch (status) {
      case 'completed':
        return <CheckCircle2 className={`${iconClass} text-green-600`} />;
      case 'planning':
      case 'researching':
      case 'analyzing':
        return <Loader2 className={`${iconClass} text-blue-600 animate-spin`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      default:
        return <Circle className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStatusColor = (status: ResearchStatus, isActive: boolean) => {
    if (!isActive && status !== 'completed') return 'text-gray-400';
    
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'planning':
      case 'researching': 
      case 'analyzing':
        return 'text-blue-700';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressBarColor = (status: ResearchStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'planning':
      case 'researching':
      case 'analyzing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: ResearchStatus) => {
    switch (status) {
      case 'pending':
        return '待機中';
      case 'planning':
        return '計画中';
      case 'researching':
        return 'リサーチ中';
      case 'analyzing':
        return '分析中';
      case 'completed':
        return '完了';
      case 'error':
        return 'エラー';
      default:
        return '不明';
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    return new Date(timeStr).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return null;
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '< 1分';
    if (diffMins < 60) return `${diffMins}分`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (remainingMins === 0) return `${diffHours}時間`;
    return `${diffHours}時間${remainingMins}分`;
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">リサーチ進捗</h2>
      
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const isActive = stage.id === currentStageId;
          const isCompleted = stage.status === 'completed';
          const isInProgress = ['planning', 'researching', 'analyzing'].includes(stage.status);
          
          return (
            <div key={stage.id} className="relative">
              {/* Connection Line */}
              {index < stages.length - 1 && (
                <div 
                  className={`absolute left-3 top-8 w-0.5 h-8 ${
                    isCompleted ? 'bg-green-200' : 'bg-gray-200'
                  }`}
                />
              )}
              
              {/* Stage Item */}
              <div className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              }`}>
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(stage.status, isActive)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold ${getStatusColor(stage.status, isActive)}`}>
                      {stage.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isCompleted 
                          ? 'bg-green-100 text-green-800'
                          : isInProgress
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getStatusText(stage.status)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {stage.description}
                  </p>
                  
                  {/* Progress Bar */}
                  {(isInProgress || isCompleted) && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">進捗</span>
                        <span className="text-xs font-medium text-gray-700">
                          {stage.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(stage.status)}`}
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Timing Information */}
                  {(stage.startTime || stage.endTime) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {stage.startTime && (
                        <div className="flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          <span>開始: {formatTime(stage.startTime)}</span>
                        </div>
                      )}
                      
                      {stage.endTime && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>完了: {formatTime(stage.endTime)}</span>
                        </div>
                      )}
                      
                      {stage.startTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>所要時間: {calculateDuration(stage.startTime, stage.endTime)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Overall Progress */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">全体の進捗</span>
          <span className="text-sm font-semibold text-gray-900">
            {Math.round(stages.reduce((acc, stage) => acc + stage.progress, 0) / stages.length)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.round(stages.reduce((acc, stage) => acc + stage.progress, 0) / stages.length)}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}