/**
 * Simple Session List Component (No UI dependencies)
 * 
 * Minimal session management interface without external UI library dependencies.
 * Used for testing the core functionality.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Mock session data for testing - using fixed timestamps to avoid hydration errors
const baseTime = 1726020000000; // Fixed base timestamp
const mockSessions = [
  {
    id: '1',
    title: 'Project Planning Session',
    description: 'Planning the next quarter goals',
    workspaceId: 'workspace1',
    userId: 'user1',
    createdAt: baseTime - 86400000, // 1 day ago
    updatedAt: baseTime - 43200000, // 12 hours ago
    lastAccessedAt: baseTime - 3600000, // 1 hour ago
    version: 1
  },
  {
    id: '2',
    title: 'Team Meeting Notes',
    description: 'Weekly sync discussion points',
    workspaceId: 'workspace1',
    userId: 'user1',
    createdAt: baseTime - 172800000, // 2 days ago
    updatedAt: baseTime - 86400000, // 1 day ago
    lastAccessedAt: baseTime - 7200000, // 2 hours ago
    version: 1
  }
];

interface SimpleSessionListProps {
  showCreateButton?: boolean;
}

export function SimpleSessionList({ showCreateButton = true }: SimpleSessionListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [sessions] = useState(mockSessions);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  }, [sessions]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleCreateSession = () => {
    if (newSessionTitle.trim()) {
      console.log('Creating session:', newSessionTitle);
      setNewSessionTitle('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 data-testid="sessions-title" className="text-2xl font-semibold text-foreground mb-1">
            Your Sessions
          </h2>
          <div className="flex gap-2 items-center">
            <Badge variant="secondary">
              {sessions.length} total
            </Badge>
          </div>
        </div>
        
        {showCreateButton && (
          <Button
            onClick={() => setShowCreateModal(true)}
            data-testid="create-session-button"
          >
            + New Session
          </Button>
        )}
      </div>

      {/* Sessions List */}
      <div data-testid="session-list" className="grid gap-4">
        {sortedSessions.length === 0 ? (
          <div 
            data-testid="session-list-empty"
            style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '2px dashed #d1d5db'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#6b7280' }}>No Sessions Yet</h3>
            <p style={{ margin: '0 0 20px 0', color: '#9ca3af' }}>
              Create your first thinking session to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              data-testid="create-first-session-button"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Create Your First Session
            </button>
          </div>
        ) : (
          sortedSessions.map((session) => (
            <div
              key={session.id}
              data-testid="session-card"
              data-session-title={session.title}
              data-session-id={session.id}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                ':hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
              }}
            >
              <Link 
                href={`/sessions/${session.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#111827' }}>
                      {session.title}
                    </h3>
                    {session.description && (
                      <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px' }}>
                        {session.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                      <span>Created {formatDate(session.createdAt)}</span>
                      <span>•</span>
                      <span>Accessed {formatDate(session.lastAccessedAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Delete session:', session.id);
                    }}
                    data-testid="session-delete-button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '16px'
                    }}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div
          data-testid="create-session-modal"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Create New Session</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label 
                htmlFor="session-title"
                style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'medium' }}
              >
                Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="session-title"
                data-testid="session-title-input"
                type="text"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="Enter session title..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                autoFocus
                maxLength={200}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label 
                htmlFor="session-description"
                style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'medium' }}
              >
                Description (optional)
              </label>
              <textarea
                id="session-description"
                data-testid="session-description-input"
                placeholder="Add a description for this session..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                maxLength={2000}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                data-testid="create-session-cancel"
                style={{
                  background: 'white',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newSessionTitle.trim()}
                data-testid="create-session-submit"
                style={{
                  background: newSessionTitle.trim() ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: newSessionTitle.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}