'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFileSystem } from '@/lib/data-store';
import { redirect } from 'next/navigation';
import { SWOTAnalysisPage } from '@/components/swot-analysis-page';
import { LeanCanvasPage } from '@/components/lean-canvas-page';
import { BusinessModelCanvasPage } from '@/components/business-model-canvas-page';
import { ThreeCAnalysisPage } from '@/components/3c-analysis-page';
import { ValuePropositionCanvasPage } from '@/components/value-proposition-canvas-page';
import { PersonaDesignPage } from '@/components/persona-design-page';
import { BusinessChatPage } from '@/components/business-chat-page';

export default function PageContent() {
  const params = useParams();
  const fs = useFileSystem();
  const sessionId = params.sessionId as string;
  const pageId = params.pageId as string;
  
  const [pageType, setPageType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPageType = async () => {
      try {
        setIsLoading(true);
        const pagePath = `/sessions/${sessionId}/pages/${pageId}`;
        const type = await fs.read(`${pagePath}/type`);
        setPageType(type);
      } catch (err) {
        console.error('Failed to load page type:', err);
        setError('Failed to load page');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId && pageId) {
      loadPageType();
    }
  }, [fs, sessionId, pageId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-gray-600">Loading page...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Render appropriate page component based on type
  switch (pageType) {
    case 'deep-research':
      // Redirect to dedicated deep-research page
      redirect(`/sessions/${sessionId}/pages/${pageId}/deep-research`);
      break;
    case 'swot-analysis':
      return <SWOTAnalysisPage />;
    case 'lean-canvas':
      return <LeanCanvasPage />;
    case 'business-model-canvas':
      return <BusinessModelCanvasPage />;
    case '3c-analysis':
      return <ThreeCAnalysisPage />;
    case 'value-proposition-canvas':
      return <ValuePropositionCanvasPage />;
    case 'persona-design':
      return <PersonaDesignPage />;
    case 'business-chat':
      return <BusinessChatPage />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unknown Page Type</h2>
            <p className="text-gray-600">Page type "{pageType}" is not supported.</p>
          </div>
        </div>
      );
  }
}