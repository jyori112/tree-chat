'use client'

/**
 * DataProvider Demo Component
 * 
 * Demonstrates the functionality of the DataProvider system
 * including workspace management, cache stats, and data operations.
 */

import React, { useState } from 'react'
import { 
  useData, 
  useWorkspaceInfo, 
  useCacheMetrics, 
  useConnectionStatus,
  useDataRefresh 
} from '@/providers/data'
import { useRead, useWrite } from '@/hooks/data'

export function DataProviderDemo() {
  const { 
    isLoading, 
    error, 
    workspace, 
    isAuthenticated, 
    switchWorkspace, 
    clearCache 
  } = useData()
  
  const workspaceInfo = useWorkspaceInfo()
  const cacheMetrics = useCacheMetrics()
  const connectionStatus = useConnectionStatus()
  const { refreshAll, refreshPath } = useDataRefresh()
  
  // Demo data operations
  const { data: demoData, loading: demoLoading } = useRead('/demo/counter', {
    defaultValue: { count: 0, lastUpdated: new Date().toISOString() }
  })
  const { write: writeDemoData } = useWrite()
  
  const [newWorkspaceId, setNewWorkspaceId] = useState('')

  const incrementCounter = async () => {
    if (demoData) {
      await writeDemoData('/demo/counter', {
        count: demoData.count + 1,
        lastUpdated: new Date().toISOString()
      })
    }
  }

  const resetCounter = async () => {
    await writeDemoData('/demo/counter', {
      count: 0,
      lastUpdated: new Date().toISOString()
    })
  }

  if (isLoading) {
    return <div className="p-4 bg-yellow-50 rounded-lg">Loading data provider...</div>
  }

  if (error) {
    return <div className="p-4 bg-red-50 rounded-lg text-red-700">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Data Provider Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Authentication Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Authentication</h4>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </div>
          </div>

          {/* Connection Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Connection</h4>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              connectionStatus.isConnected ? 'bg-green-100 text-green-800' : 
              connectionStatus.isConnecting ? 'bg-yellow-100 text-yellow-800' : 
              connectionStatus.hasError ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus.connectionState}
            </div>
            {connectionStatus.lastSync && (
              <p className="text-xs text-gray-600 mt-1">
                Last sync: {new Date(connectionStatus.lastSync).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Cache Metrics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Cache Performance</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Hits: {cacheMetrics.hits}</p>
              <p>Misses: {cacheMetrics.misses}</p>
              <p>Hit Rate: {cacheMetrics.hitRate}%</p>
              <p>Invalidations: {cacheMetrics.invalidations}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Workspace Information</h3>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Workspace ID</p>
              <p className="text-sm text-gray-600">{workspaceInfo.workspaceId || 'None'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Display Name</p>
              <p className="text-sm text-gray-600">{workspaceInfo.displayName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Type</p>
              <p className="text-sm text-gray-600 capitalize">{workspaceInfo.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">User ID</p>
              <p className="text-sm text-gray-600">{workspaceInfo.userId || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Workspace Switching */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="New workspace ID"
            value={newWorkspaceId}
            onChange={(e) => setNewWorkspaceId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={() => {
              if (newWorkspaceId.trim()) {
                switchWorkspace(newWorkspaceId.trim())
                setNewWorkspaceId('')
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Switch
          </button>
        </div>
      </div>

      {/* Data Operations Demo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Data Operations Demo</h3>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Demo Counter</p>
              <p className="text-2xl font-bold text-blue-600">
                {demoLoading ? 'Loading...' : demoData?.count || 0}
              </p>
              {demoData?.lastUpdated && (
                <p className="text-xs text-gray-600">
                  Updated: {new Date(demoData.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-x-2">
              <button
                onClick={incrementCounter}
                disabled={demoLoading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                +1
              </button>
              <button
                onClick={resetCounter}
                disabled={demoLoading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Cache Management</h3>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => clearCache()}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
          >
            Clear Cache
          </button>
          <button
            onClick={() => refreshAll()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Refresh All Data
          </button>
          <button
            onClick={() => refreshPath('/demo/counter')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
          >
            Refresh Counter
          </button>
        </div>
      </div>
    </div>
  )
}