/**
 * Real-time Synchronization Manager
 * 
 * Handles WebSocket connections and real-time data synchronization
 * between clients and server for collaborative features.
 */

import type { SyncEvent, SyncConfig, WorkspaceContext } from './types'
import { formatErrorMessage, debounce } from './utils'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SyncManagerCallbacks {
  onConnectionStateChange: (state: ConnectionState) => void
  onSyncEvent: (event: SyncEvent) => void
  onError: (error: string) => void
  onSync: (timestamp: string) => void
}

export class SyncManager {
  private ws: WebSocket | null = null
  private config: SyncConfig
  private workspace: WorkspaceContext | null = null
  private callbacks: SyncManagerCallbacks
  private reconnectAttempts = 0
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private connectionState: ConnectionState = 'disconnected'
  private messageQueue: any[] = []
  private isDestroyed = false

  // Debounced functions for optimization
  private debouncedSync = debounce(() => this.performSync(), 1000)

  constructor(config: SyncConfig, callbacks: SyncManagerCallbacks) {
    this.config = config
    this.callbacks = callbacks
  }

  /**
   * Connect to WebSocket server
   */
  async connect(workspace: WorkspaceContext, token?: string): Promise<void> {
    if (this.isDestroyed) return
    if (!this.config.enabled) return
    if (!this.config.wsUrl) {
      throw new Error('WebSocket URL not configured')
    }
    if (!workspace.workspaceId) {
      throw new Error('Workspace ID required for sync')
    }

    this.workspace = workspace
    this.updateConnectionState('connecting')

    try {
      // Construct WebSocket URL with workspace and auth info
      const url = new URL(this.config.wsUrl)
      url.searchParams.set('workspaceId', workspace.workspaceId)
      if (workspace.userId) {
        url.searchParams.set('userId', workspace.userId)
      }
      if (token) {
        url.searchParams.set('token', token)
      }

      this.ws = new WebSocket(url.toString())

      this.ws.onopen = () => {
        this.onConnectionOpen()
      }

      this.ws.onmessage = (event) => {
        this.onMessage(event)
      }

      this.ws.onclose = (event) => {
        this.onConnectionClose(event)
      }

      this.ws.onerror = (event) => {
        this.onConnectionError(event)
      }

    } catch (error) {
      const message = formatErrorMessage(error)
      this.callbacks.onError(message)
      this.updateConnectionState('error')
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat()
    this.clearReconnectTimeout()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.updateConnectionState('disconnected')
    this.reconnectAttempts = 0
    this.messageQueue = []
  }

  /**
   * Send data change event to server
   */
  sendDataChange(path: string, data: any, operation: 'write' | 'delete'): void {
    if (!this.workspace?.workspaceId) return

    const event: SyncEvent = {
      type: 'data_updated',
      workspaceId: this.workspace.workspaceId,
      path,
      data: operation === 'delete' ? null : data,
      userId: this.workspace.userId || undefined,
      timestamp: new Date().toISOString()
    }

    this.sendEvent(event)
  }

  /**
   * Send workspace change event
   */
  sendWorkspaceChange(workspaceId: string): void {
    const event: SyncEvent = {
      type: 'workspace_changed',
      workspaceId,
      userId: this.workspace?.userId || undefined,
      timestamp: new Date().toISOString()
    }

    this.sendEvent(event)
  }

  /**
   * Force synchronization
   */
  forceSync(): void {
    this.debouncedSync()
  }

  /**
   * Update workspace context
   */
  updateWorkspace(workspace: WorkspaceContext): void {
    const workspaceChanged = this.workspace?.workspaceId !== workspace.workspaceId
    this.workspace = workspace

    if (workspaceChanged && this.connectionState === 'connected') {
      // Reconnect to new workspace
      this.disconnect()
      if (workspace.workspaceId) {
        this.connect(workspace)
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Destroy the sync manager
   */
  destroy(): void {
    this.isDestroyed = true
    this.disconnect()
  }

  // Private methods

  private onConnectionOpen(): void {
    this.updateConnectionState('connected')
    this.reconnectAttempts = 0
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Send queued messages
    this.flushMessageQueue()
    
    // Notify successful sync
    this.callbacks.onSync(new Date().toISOString())
  }

  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      
      // Handle different message types
      switch (data.type) {
        case 'sync_event':
          if (this.isValidSyncEvent(data.payload)) {
            this.callbacks.onSyncEvent(data.payload)
          }
          break
          
        case 'heartbeat':
          // Respond to server heartbeat
          this.sendRaw({ type: 'heartbeat_ack' })
          break
          
        case 'error':
          this.callbacks.onError(data.message || 'Server error')
          break
          
        case 'sync_complete':
          this.callbacks.onSync(data.timestamp || new Date().toISOString())
          break
          
        default:
          console.warn('Unknown message type:', data.type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private onConnectionClose(event: CloseEvent): void {
    this.stopHeartbeat()
    this.ws = null
    
    if (!this.isDestroyed) {
      if (event.code === 1000) {
        // Normal closure
        this.updateConnectionState('disconnected')
      } else {
        // Unexpected closure
        this.updateConnectionState('error')
        this.scheduleReconnect()
      }
    }
  }

  private onConnectionError(event: Event): void {
    const message = 'WebSocket connection error'
    this.callbacks.onError(message)
    this.updateConnectionState('error')
    this.scheduleReconnect()
  }

  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.callbacks.onConnectionStateChange(state)
    }
  }

  private sendEvent(event: SyncEvent): void {
    this.sendRaw({ 
      type: 'sync_event',
      payload: event 
    })
  }

  private sendRaw(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      // Queue message for later
      this.messageQueue.push(data)
    }
  }

  private flushMessageQueue(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.messageQueue.length > 0) {
      for (const message of this.messageQueue) {
        this.ws.send(JSON.stringify(message))
      }
      this.messageQueue = []
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendRaw({ type: 'heartbeat' })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return
    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.callbacks.onError('Max reconnection attempts reached')
      return
    }

    this.clearReconnectTimeout()
    
    const delay = this.config.retryDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed && this.workspace) {
        this.connect(this.workspace)
      }
    }, delay)
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  private performSync(): void {
    if (!this.workspace?.workspaceId) return
    
    // Send sync request to server
    this.sendRaw({
      type: 'sync_request',
      workspaceId: this.workspace.workspaceId,
      timestamp: new Date().toISOString()
    })
  }

  private isValidSyncEvent(event: any): event is SyncEvent {
    return (
      event &&
      typeof event === 'object' &&
      typeof event.type === 'string' &&
      typeof event.workspaceId === 'string' &&
      typeof event.timestamp === 'string'
    )
  }
}