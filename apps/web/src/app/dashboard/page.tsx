import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SimpleSessionList } from '@/components/SimpleSessionList'

export default async function DashboardPage() {
  // Skip auth for tests
  const skipAuth = process.env.SKIP_AUTH_FOR_TESTS === 'true'
  
  if (!skipAuth) {
    const { userId } = await auth()
    if (!userId) {
      redirect('/sign-in')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="dashboard-title">
                Tree Chat Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your structured thinking workspace
              </p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Session Management Section */}
          <div className="mb-8">
            <SimpleSessionList />
          </div>
        </div>
      </main>
    </div>
  )
}