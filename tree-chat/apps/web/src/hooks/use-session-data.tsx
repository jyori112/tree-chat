'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFileSystem } from '@/lib/data-store';

export interface SessionPage {
  id: string;
  name: string;
  type: string;
  fields: Record<string, any>;
  createdAt: string;
}

export interface SessionData {
  sessionId: string;
  pages: SessionPage[];
  loading: boolean;
  error: string | null;
}

export function useSessionData(sessionId: string): SessionData {
  const fs = useFileSystem();
  const [pages, setPages] = useState<SessionPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessionData = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pagesPath = `/sessions/${sessionId}/pages`;
      const exists = await fs.exists(pagesPath);
      
      if (!exists) {
        setPages([]);
        setLoading(false);
        return;
      }

      const pageIds = await fs.ls(pagesPath);
      const loadedPages: SessionPage[] = [];

      for (const pageId of pageIds) {
        const pagePath = `${pagesPath}/${pageId}`;
        
        try {
          // Read page metadata
          const [name, type, createdAt] = await Promise.all([
            fs.read(`${pagePath}/name`).catch(() => 'Unnamed Page'),
            fs.read(`${pagePath}/type`).catch(() => 'unknown'),
            fs.read(`${pagePath}/created_at`).catch(() => new Date().toISOString()),
          ]);

          // Read all fields
          const fieldsPath = `${pagePath}/fields`;
          let fields: Record<string, any> = {};
          
          if (await fs.exists(fieldsPath)) {
            const fieldNames = await fs.ls(fieldsPath);
            
            for (const fieldName of fieldNames) {
              try {
                const fieldValue = await fs.read(`${fieldsPath}/${fieldName}`);
                fields[fieldName] = fieldValue;
              } catch (err) {
                console.error(`Failed to read field ${fieldName}:`, err);
              }
            }
          }

          loadedPages.push({
            id: pageId,
            name,
            type,
            fields,
            createdAt,
          });
        } catch (err) {
          console.error(`Failed to load page ${pageId}:`, err);
        }
      }

      // Sort pages by creation date
      loadedPages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setPages(loadedPages);
    } catch (err) {
      console.error('Failed to load session data:', err);
      setError('Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, [fs, sessionId]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  return {
    sessionId,
    pages,
    loading,
    error,
  };
}