'use client';

import { UserButton } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { EditableSessionTitle } from '@/components/EditableSessionTitle'
import { EditableSessionDescription } from '@/components/EditableSessionDescription'
import { useState, useEffect } from 'react'

// Mock session data - using fixed timestamps to avoid hydration errors
const baseTime = 1726020000000; // Fixed base timestamp
const mockSessions = {
  '1': {
    id: '1',
    title: 'Project Planning Session',
    description: 'Planning the next quarter goals',
    workspaceId: 'workspace1',
    userId: 'user1',
    createdAt: baseTime - 86400000,
    updatedAt: baseTime - 43200000,
    lastAccessedAt: baseTime - 3600000,
    version: 1
  },
  '2': {
    id: '2',
    title: 'Team Meeting Notes',
    description: 'Weekly sync discussion points',
    workspaceId: 'workspace1',
    userId: 'user1',
    createdAt: baseTime - 172800000,
    updatedAt: baseTime - 86400000,
    lastAccessedAt: baseTime - 7200000,
    version: 1
  }
}

interface SessionWorkspacePageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default function SessionWorkspacePage({ params }: SessionWorkspacePageProps) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH_FOR_TESTS === 'true'
  const { userId } = useAuth()
  const [sessionId, setSessionId] = useState<string>('')
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setSessionId(resolvedParams.sessionId)
      
      // Get session data (mock implementation)
      const sessionData = mockSessions[resolvedParams.sessionId as keyof typeof mockSessions]
      setSession(sessionData)
    }
    
    getParams()
  }, [params])

  if (!skipAuth && !userId) {
    redirect('/sign-in')
  }

  if (!session) {
    return <div>Loading...</div>
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }

  const handleTitleSave = (newTitle: string) => {
    // In a real app, this would make an API call to update the session
    console.log('Updating session title:', newTitle)
    setSession({ ...session, title: newTitle })
  }

  const handleDescriptionSave = (newDescription: string) => {
    // In a real app, this would make an API call to update the session
    console.log('Updating session description:', newDescription)
    setSession({ ...session, description: newDescription })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="flex justify-between items-start py-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    ← Back
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="group">
                  <EditableSessionTitle 
                    title={session.title}
                    onSave={handleTitleSave}
                  />
                </div>
                
                <div className="max-w-2xl">
                  <EditableSessionDescription 
                    description={session.description || ''}
                    onSave={handleDescriptionSave}
                  />
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <span>Updated {formatDate(session.updatedAt)}</span>
              </div>
            </div>
            
            <div className="ml-6">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 pb-16">
        {/* Workspace Content - Clean, borderless */}
        <div data-testid="workspace-content" className="min-h-[60vh]">
          <div className="text-center py-20 text-muted-foreground">
            <div className="max-w-md mx-auto space-y-4">
              <h3 className="text-lg font-medium text-foreground">
                Ready to start thinking
              </h3>
              <p className="text-sm">
                Your workspace is ready. Begin writing, planning, or organizing your thoughts.
              </p>
              <div className="pt-4">
                <Button data-testid="placeholder-action" className="rounded-full">
                  Start Writing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}