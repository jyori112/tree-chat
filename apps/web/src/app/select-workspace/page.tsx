'use client'

import { useOrganizationList, useOrganization } from '@clerk/nextjs'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SelectWorkspacePage() {
  const { organizationList, setActive } = useOrganizationList()
  const { organization } = useOrganization()
  const [workspaceName, setWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceName.trim()) return

    setIsCreating(true)
    try {
      const newOrg = await organizationList?.createOrganization({ name: workspaceName })
      if (newOrg) {
        await setActive({ organization: newOrg.id })
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to create workspace:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectWorkspace = async (orgId: string) => {
    try {
      await setActive({ organization: orgId })
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to switch workspace:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Select Workspace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose a workspace or create a new one
          </p>
        </div>

        {/* Existing workspaces */}
        {organizationList?.data && organizationList.data.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Your Workspaces</h3>
            {organizationList.data.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelectWorkspace(org.id)}
                className="w-full p-4 text-left border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="font-medium text-gray-900">{org.name}</div>
                <div className="text-sm text-gray-500">
                  {org.membersCount} member{org.membersCount !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create new workspace */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Create New Workspace</h3>
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <input
              type="text"
              placeholder="Enter workspace name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isCreating || !workspaceName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}