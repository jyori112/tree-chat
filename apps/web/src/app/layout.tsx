import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { DataProvider } from '@/providers/data'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Tree Chat - Structured Thinking Platform',
  description: 'AI-powered structured thinking and framework support',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <DataProvider
            config={{
              debug: process.env.NODE_ENV === 'development',
              cache: {
                enabled: true,
                defaultTTL: 5 * 60 * 1000, // 5 minutes
                maxSize: 1000,
                cleanupInterval: 60 * 1000 // 1 minute
              },
              sync: {
                enabled: false, // Can be enabled via environment variable later
                maxRetries: 3,
                retryDelay: 1000,
                heartbeatInterval: 30000
              }
            }}
          >
            {children}
          </DataProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}