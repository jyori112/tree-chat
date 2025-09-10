# Data Infrastructure React Hooks

React hooks for interacting with the Tree Chat hierarchical data store. These hooks provide type-safe, authenticated data access with built-in caching, error handling, optimistic updates, and seamless integration with Clerk authentication.

## Overview

The data hooks provide a declarative, React-friendly interface to the data infrastructure:

- **`useRead`** - Read data from hierarchical paths with caching
- **`useWrite`** - Write data with optimistic updates and rollback
- **`useReadWithDefault`** - Read data with fallback default values
- **`useReadTree`** - Query hierarchical data structures
- **`useBatch`** - Perform atomic batch operations
- **`useBatchBuilder`** - Build complex batch operations declaratively

All hooks automatically handle:
- Clerk authentication integration
- Workspace-scoped data access
- Loading states and error handling
- Request caching and invalidation
- Optimistic UI updates
- Request cancellation and cleanup

## Installation

These hooks are part of the Tree Chat web application and don't require separate installation. They depend on:

```json
{
  "@clerk/nextjs": "^4.x",
  "@tanstack/react-query": "^5.x",
  "react": "^18.x"
}
```

## Quick Start

### Basic Usage

```tsx
import { useRead, useWrite } from '@/hooks/data'

function UserProfile() {
  // Read user profile data
  const { data: profile, loading, error } = useRead('/user/profile', {
    defaultValue: { name: '', email: '' }
  })
  
  // Write capability
  const { write, loading: saving } = useWrite()
  
  const handleSave = async (newProfile: any) => {
    try {
      await write('/user/profile', newProfile)
      console.log('Profile saved!')
    } catch (err) {
      console.error('Save failed:', err)
    }
  }
  
  if (loading) return <div>Loading profile...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
      <button 
        onClick={() => handleSave({ name: 'Updated Name', email: profile.email })}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
```

## Hook Reference

### 1. useRead

Reads data from a hierarchical path with caching and automatic updates.

```tsx
const state = useRead<T>(path: string, options?: ReadOptions)
```

**Parameters:**
- `path` - Hierarchical path (e.g., '/user/settings')
- `options` - Configuration options

**Returns:**
```typescript
{
  data: T | null,           // The retrieved data
  loading: boolean,         // Loading state
  error: string | null,     // Error message if failed
  timestamp: Date | null,   // Last successful fetch timestamp
  refresh: () => Promise<void>, // Manual refresh function
  cancel: () => void        // Cancel ongoing request
}
```

**Options:**
```typescript
interface ReadOptions {
  defaultValue?: any        // Default value when data doesn't exist
  cache?: boolean          // Enable caching (default: true)
  cacheDuration?: number   // Cache duration in ms (default: 5min)
  immediate?: boolean      // Fetch immediately (default: true)
  pollInterval?: number    // Auto-refresh interval in ms
}
```

**Examples:**

```tsx
// Basic usage
const { data, loading, error } = useRead('/user/preferences')

// With default value
const { data: settings } = useRead('/user/settings', {
  defaultValue: { theme: 'light', notifications: true }
})

// With polling
const { data: status } = useRead('/system/status', {
  pollInterval: 10000 // Check every 10 seconds
})

// With custom cache duration
const { data: config } = useRead('/workspace/config', {
  cacheDuration: 30 * 60 * 1000 // 30 minutes
})

// Manual refresh
function RefreshableData() {
  const { data, loading, refresh } = useRead('/live/data')
  
  return (
    <div>
      <div>{JSON.stringify(data)}</div>
      <button onClick={() => refresh()} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  )
}
```

### 2. useWrite

Writes data to hierarchical paths with optimistic updates and error handling.

```tsx
const state = useWrite(options?: WriteOptions)
```

**Returns:**
```typescript
{
  write: (path: string, value: any) => Promise<void>, // Write function
  loading: boolean,         // Write operation in progress
  error: string | null,     // Error message if failed
  lastWrite: {              // Information about last write
    path: string,
    timestamp: Date
  } | null
}
```

**Options:**
```typescript
interface WriteOptions {
  optimistic?: boolean     // Enable optimistic updates (default: true)
  invalidateCache?: boolean // Invalidate related cache entries (default: true)
  retryAttempts?: number   // Number of retry attempts (default: 3)
}
```

**Examples:**

```tsx
// Basic write
function UserSettings() {
  const { data: settings } = useRead('/user/settings')
  const { write, loading: saving } = useWrite()
  
  const updateTheme = async (theme: string) => {
    await write('/user/settings', { ...settings, theme })
  }
  
  return (
    <button onClick={() => updateTheme('dark')} disabled={saving}>
      {saving ? 'Saving...' : 'Switch to Dark Theme'}
    </button>
  )
}

// Write with error handling
function SaveButton({ data }: { data: any }) {
  const { write, loading, error } = useWrite()
  
  const handleSave = async () => {
    try {
      await write('/user/data', data)
      // Success feedback
    } catch (err) {
      // Error already captured in hook's error state
      console.error('Save failed')
    }
  }
  
  return (
    <div>
      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
      {error && <div className="error">Error: {error}</div>}
    </div>
  )
}

// Optimistic updates
function OptimisticCounter() {
  const { data: count } = useRead('/user/counter', { defaultValue: 0 })
  const { write } = useWrite({ optimistic: true })
  
  const increment = () => {
    // UI updates immediately, then syncs to server
    write('/user/counter', count + 1)
  }
  
  return (
    <div>
      <span>Count: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  )
}
```

### 3. useReadWithDefault

Reads data with a guaranteed default value, eliminating null checks.

```tsx
const state = useReadWithDefault<T>(
  path: string, 
  defaultValue: T, 
  options?: ReadOptions
)
```

**Returns:**
```typescript
{
  data: T,                  // Always returns data (never null)
  loading: boolean,         // Loading state
  error: string | null,     // Error message
  wasDefault: boolean,      // True if default value is being used
  refresh: () => Promise<void>
}
```

**Examples:**

```tsx
// Always have valid settings object
function AppSettings() {
  const { data: settings, wasDefault } = useReadWithDefault('/user/settings', {
    theme: 'light',
    notifications: true,
    language: 'en-US'
  })
  
  return (
    <div>
      {wasDefault && <div>Using default settings</div>}
      <p>Theme: {settings.theme}</p>
      <p>Notifications: {settings.notifications ? 'On' : 'Off'}</p>
      <p>Language: {settings.language}</p>
    </div>
  )
}

// Form with guaranteed initial values
function UserForm() {
  const { data: userData } = useReadWithDefault('/user/profile', {
    name: '',
    email: '',
    bio: '',
    preferences: {
      newsletter: false,
      marketing: false
    }
  })
  
  const [formData, setFormData] = useState(userData)
  
  // Form fields always have values, no null checks needed
  return (
    <form>
      <input 
        value={formData.name} 
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input 
        value={formData.email} 
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      {/* More form fields... */}
    </form>
  )
}
```

### 4. useReadTree

Queries hierarchical data structures using path prefixes.

```tsx
const state = useReadTree<T>(pathPrefix: string, options?: TreeOptions)
```

**Returns:**
```typescript
{
  items: Record<string, T>, // Map of paths to data
  loading: boolean,         // Loading state
  error: string | null,     // Error message
  totalCount: number,       // Number of items retrieved
  refresh: () => Promise<void>
}
```

**Options:**
```typescript
interface TreeOptions extends ReadOptions {
  maxDepth?: number        // Maximum tree depth (default: unlimited)
  maxItems?: number        // Maximum items to retrieve (default: 1000)
  includeMetadata?: boolean // Include timestamps and metadata
}
```

**Examples:**

```tsx
// Load all user data
function UserDataTree() {
  const { items, loading, totalCount } = useReadTree('/user')
  
  if (loading) return <div>Loading user data...</div>
  
  return (
    <div>
      <h3>User Data ({totalCount} items)</h3>
      {Object.entries(items).map(([path, data]) => (
        <div key={path}>
          <strong>{path}:</strong> {JSON.stringify(data)}
        </div>
      ))}
    </div>
  )
}

// Project file browser
function ProjectFiles({ projectId }: { projectId: string }) {
  const { items, loading } = useReadTree(`/projects/${projectId}/files`, {
    maxDepth: 3,
    maxItems: 500
  })
  
  const renderTreeItem = (path: string, data: any, level = 0) => (
    <div key={path} style={{ paddingLeft: level * 20 }}>
      <div>{path.split('/').pop()}</div>
      {data && typeof data === 'object' && (
        <div>Size: {data.size || 'Unknown'}</div>
      )}
    </div>
  )
  
  return (
    <div>
      <h3>Project Files</h3>
      {loading ? (
        <div>Loading files...</div>
      ) : (
        <div>
          {Object.entries(items).map(([path, data]) => 
            renderTreeItem(path, data)
          )}
        </div>
      )}
    </div>
  )
}

// Configuration viewer
function ConfigViewer() {
  const { items, refresh } = useReadTree('/config', {
    cache: false, // Always get fresh config
    includeMetadata: true
  })
  
  return (
    <div>
      <button onClick={() => refresh()}>Refresh Config</button>
      <pre>{JSON.stringify(items, null, 2)}</pre>
    </div>
  )
}
```

### 5. useBatch

Performs atomic batch operations for complex data updates.

```tsx
const state = useBatch(options?: BatchOptions)
```

**Returns:**
```typescript
{
  execute: (operations: BatchOperation[]) => Promise<BatchResult[]>,
  loading: boolean,         // Batch operation in progress
  error: string | null,     // Error message
  results: BatchResult[] | null // Results from last batch
}
```

**Types:**
```typescript
interface BatchOperation {
  type: 'read' | 'write'
  path: string
  value?: any              // Required for write operations
}

interface BatchResult {
  type: 'read' | 'write'
  path: string
  success: boolean
  data?: any              // For read operations
  error?: string          // Error message if failed
}
```

**Examples:**

```tsx
// Atomic user profile update
function ProfileEditor() {
  const { execute: executeBatch, loading } = useBatch()
  const { data: profile } = useRead('/user/profile')
  
  const saveProfile = async (newProfile: any) => {
    const operations = [
      { type: 'write', path: '/user/profile', value: newProfile },
      { type: 'write', path: '/user/last_updated', value: new Date().toISOString() },
      { type: 'read', path: '/user/version' } // Get updated version
    ]
    
    try {
      const results = await executeBatch(operations)
      console.log('Profile saved, new version:', results[2].data)
    } catch (error) {
      console.error('Batch operation failed:', error)
    }
  }
  
  return (
    <button onClick={() => saveProfile(profile)} disabled={loading}>
      {loading ? 'Saving...' : 'Save Profile'}
    </button>
  )
}

// Data migration
function DataMigration() {
  const { execute, loading, error } = useBatch()
  
  const migrateUserData = async () => {
    const operations = [
      { type: 'read', path: '/user/old_settings' },
      { type: 'write', path: '/user/settings_v2', value: null }, // Will be updated
      { type: 'write', path: '/user/old_settings', value: null }  // Delete old
    ]
    
    // First read the old data
    const [readResult] = await execute([operations[0]])
    
    if (readResult.success && readResult.data) {
      // Transform the data
      const transformedData = transformSettings(readResult.data)
      
      // Complete the migration
      await execute([
        { type: 'write', path: '/user/settings_v2', value: transformedData },
        { type: 'write', path: '/user/old_settings', value: null }
      ])
    }
  }
  
  return (
    <div>
      <button onClick={migrateUserData} disabled={loading}>
        {loading ? 'Migrating...' : 'Migrate Data'}
      </button>
      {error && <div>Error: {error}</div>}
    </div>
  )
}
```

### 6. useBatchBuilder

Declarative batch operation builder for complex workflows.

```tsx
const builder = useBatchBuilder()
```

**Returns:**
```typescript
{
  addRead: (path: string) => this,           // Add read operation
  addWrite: (path: string, value: any) => this, // Add write operation
  clear: () => this,                         // Clear all operations
  execute: () => Promise<BatchResult[]>,     // Execute the batch
  operations: BatchOperation[],              // Current operations
  loading: boolean,                          // Execution state
  error: string | null                       // Error state
}
```

**Examples:**

```tsx
// Fluent batch building
function ComplexUpdate() {
  const builder = useBatchBuilder()
  
  const performComplexUpdate = async (userData: any) => {
    const results = await builder
      .clear()
      .addWrite('/user/profile', userData.profile)
      .addWrite('/user/preferences', userData.preferences)
      .addWrite('/user/last_updated', new Date().toISOString())
      .addRead('/user/version')
      .execute()
    
    console.log('Update complete:', results)
  }
  
  return (
    <button 
      onClick={() => performComplexUpdate(someUserData)}
      disabled={builder.loading}
    >
      {builder.loading ? 'Updating...' : 'Complex Update'}
    </button>
  )
}

// Conditional batch building
function ConditionalOperations({ condition }: { condition: boolean }) {
  const builder = useBatchBuilder()
  
  useEffect(() => {
    builder.clear().addRead('/user/base_data')
    
    if (condition) {
      builder.addRead('/user/extended_data')
    }
    
    builder.execute()
  }, [condition])
  
  return <div>Operations: {builder.operations.length}</div>
}
```

## Advanced Usage

### Custom Hook Composition

```tsx
// Custom hook combining multiple data operations
function useUserDashboard(userId: string) {
  const { data: profile } = useRead(`/users/${userId}/profile`)
  const { data: stats } = useRead(`/users/${userId}/stats`, {
    pollInterval: 30000 // Update every 30 seconds
  })
  const { items: projects } = useReadTree(`/users/${userId}/projects`)
  const { write: updateProfile } = useWrite()
  
  const updateUserProfile = useCallback((newProfile: any) => {
    return updateProfile(`/users/${userId}/profile`, newProfile)
  }, [userId, updateProfile])
  
  return {
    profile,
    stats, 
    projects,
    updateProfile: updateUserProfile,
    isLoading: !profile || !stats
  }
}

// Usage
function UserDashboard({ userId }: { userId: string }) {
  const { profile, stats, projects, updateProfile, isLoading } = 
    useUserDashboard(userId)
  
  if (isLoading) return <div>Loading dashboard...</div>
  
  return (
    <div>
      <h1>{profile.name}</h1>
      <div>Projects: {Object.keys(projects).length}</div>
      <div>Stats: {JSON.stringify(stats)}</div>
    </div>
  )
}
```

### Error Handling Patterns

```tsx
// Centralized error handling
function useDataWithErrorBoundary<T>(path: string) {
  const { data, loading, error } = useRead<T>(path)
  
  useEffect(() => {
    if (error) {
      // Report to error tracking service
      console.error('Data fetch error:', { path, error })
      
      // Show user notification
      toast.error(`Failed to load ${path}: ${error}`)
    }
  }, [error, path])
  
  return { data, loading, error }
}

// Retry logic
function useDataWithRetry<T>(path: string, maxRetries = 3) {
  const [retryCount, setRetryCount] = useState(0)
  const { data, loading, error, refresh } = useRead<T>(path)
  
  const retryWithBackoff = useCallback(async () => {
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      
      setRetryCount(prev => prev + 1)
      await refresh()
    }
  }, [retryCount, maxRetries, refresh])
  
  useEffect(() => {
    if (error && retryCount < maxRetries) {
      retryWithBackoff()
    }
  }, [error, retryWithBackoff, maxRetries, retryCount])
  
  return { 
    data, 
    loading, 
    error,
    retryCount,
    canRetry: retryCount < maxRetries
  }
}
```

### Performance Optimization

```tsx
// Memoized selectors
function useUserName(userId: string) {
  const { data: profile } = useRead(`/users/${userId}/profile`)
  
  // Only re-render when name changes
  return useMemo(() => profile?.name || 'Unknown User', [profile?.name])
}

// Debounced writes
function useDebouncedWrite(delay = 500) {
  const { write } = useWrite()
  
  const debouncedWrite = useMemo(
    () => debounce((path: string, value: any) => write(path, value), delay),
    [write, delay]
  )
  
  return { write: debouncedWrite }
}

// Background data preloading
function usePreloadData(paths: string[]) {
  useEffect(() => {
    // Preload data in background
    paths.forEach(path => {
      // Trigger read with cache=true, immediate=false
      // This populates cache without affecting UI
    })
  }, [paths])
}
```

## Best Practices

### 1. Path Organization

```tsx
// Good: Hierarchical, consistent paths
const userPaths = {
  profile: '/user/profile',
  settings: '/user/settings',
  preferences: '/user/preferences/ui',
  projects: '/user/projects'
}

// Bad: Flat, inconsistent paths
const badPaths = {
  userProfile: '/userProfile',
  userSettings: '/user_settings', 
  preferences: '/prefs',
  projects: '/userProjects'
}
```

### 2. Error Handling

```tsx
// Good: Comprehensive error handling
function DataComponent() {
  const { data, loading, error } = useRead('/user/data')
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBoundary error={error} />
  if (!data) return <EmptyState />
  
  return <DataView data={data} />
}

// Bad: No error handling
function BadComponent() {
  const { data } = useRead('/user/data')
  return <div>{data.name}</div> // Will crash if data is null
}
```

### 3. Optimistic Updates

```tsx
// Good: Proper optimistic updates with rollback
function OptimisticButton() {
  const { data: count } = useRead('/counter', { defaultValue: 0 })
  const { write } = useWrite({ optimistic: true })
  
  const increment = async () => {
    const previousValue = count
    
    try {
      await write('/counter', count + 1)
    } catch (error) {
      // Hook automatically rolls back, but show user feedback
      toast.error('Update failed, changes reverted')
    }
  }
  
  return <button onClick={increment}>Count: {count}</button>
}
```

### 4. Cache Management

```tsx
// Good: Appropriate cache durations
function useUserProfile() {
  return useRead('/user/profile', {
    cacheDuration: 10 * 60 * 1000 // 10 minutes - user data changes infrequently
  })
}

function useSystemStatus() {
  return useRead('/system/status', {
    cacheDuration: 30 * 1000, // 30 seconds - status changes frequently
    pollInterval: 60 * 1000   // Poll every minute
  })
}
```

## Performance Considerations

### Caching Strategy

- **Default cache**: 5 minutes for read operations
- **Tree queries**: 2 minutes (shorter due to complexity)
- **Optimistic updates**: Immediate cache updates
- **Cache invalidation**: Automatic on write operations

### Bundle Size

The hooks are optimized for minimal bundle impact:
- Core hooks: ~15KB gzipped
- Tree-shakable exports
- No external dependencies beyond React and Clerk

### Memory Usage

- Automatic cache cleanup
- Request cancellation on component unmount
- Debounced cache invalidation
- Memory-efficient tree operations

## Testing

### Unit Testing

```tsx
import { renderHook } from '@testing-library/react'
import { useRead } from '@/hooks/data'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ userId: 'user_123' }),
  useOrganization: () => ({ organization: { id: 'org_456' } })
}))

describe('useRead', () => {
  test('should load data successfully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useRead('/test/path')
    )
    
    expect(result.current.loading).toBe(true)
    
    await waitForNextUpdate()
    
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeDefined()
  })
})
```

### Integration Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { TestDataProvider } from '@/test-utils'

function TestComponent() {
  const { data, loading } = useRead('/user/profile')
  
  if (loading) return <div>Loading...</div>
  return <div>Name: {data?.name}</div>
}

test('should display user data', async () => {
  render(
    <TestDataProvider>
      <TestComponent />
    </TestDataProvider>
  )
  
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.getByText('Name: John Doe')).toBeInTheDocument()
  })
})
```

## Migration Guide

### From Direct API Calls

Before:
```tsx
function OldComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/data/read', {
      method: 'POST',
      body: JSON.stringify({ path: '/user/profile' })
    })
    .then(res => res.json())
    .then(data => {
      setData(data)
      setLoading(false)
    })
  }, [])
  
  if (loading) return <div>Loading...</div>
  return <div>{data?.name}</div>
}
```

After:
```tsx
function NewComponent() {
  const { data, loading } = useRead('/user/profile')
  
  if (loading) return <div>Loading...</div>
  return <div>{data?.name}</div>
}
```

### Benefits of Migration

- **Automatic caching** - No manual cache management
- **Error handling** - Built-in error states and retry logic  
- **Type safety** - Full TypeScript support
- **Optimistic updates** - Immediate UI feedback
- **Request cancellation** - Automatic cleanup
- **Authentication integration** - Seamless Clerk integration

## Troubleshooting

### Common Issues

#### Authentication Errors
```tsx
// Check authentication state
const { userId } = useAuth()
const { organization } = useOrganization()

if (!userId) {
  return <div>Please log in</div>
}

if (!organization) {
  return <div>Please select a workspace</div>
}
```

#### Cache Issues
```tsx
// Force cache refresh
const { refresh } = useRead('/user/data')

// Disable caching for debugging
const { data } = useRead('/user/data', { cache: false })
```

#### Performance Issues
```tsx
// Reduce cache duration
const { data } = useRead('/frequent/data', { cacheDuration: 30000 })

// Use polling sparingly
const { data } = useRead('/status', { 
  pollInterval: 60000 // Don't poll too frequently
})
```

## Related Documentation

- **[Data API Routes](../../app/api/data/README.md)** - HTTP API endpoints
- **[Data Client Package](../../../../packages/data-client/README.md)** - Core client library
- **[Shared Types](../../../../packages/shared/README.md)** - Type definitions
- **[Data Provider](../../providers/data/README.md)** - Context provider system