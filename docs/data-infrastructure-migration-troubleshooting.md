# Data Infrastructure Migration & Troubleshooting Guide

Comprehensive guide for migrating to the Tree Chat data infrastructure and resolving common issues during development and production deployment.

## Migration Guide

### Overview

The Tree Chat data infrastructure provides a modern, scalable approach to hierarchical data storage with workspace isolation. This guide covers migration from various existing systems and common integration patterns.

### Migration Scenarios

#### 1. From Direct Database Access

**Before**: Direct database queries and ORM usage
**After**: Hierarchical path-based data access through hooks and APIs

**Migration Steps:**

1. **Identify Data Patterns**
   ```sql
   -- Old: Direct SQL queries
   SELECT * FROM users WHERE workspace_id = ? AND user_id = ?
   SELECT * FROM user_settings WHERE user_id = ?
   ```

   ```typescript
   // New: Hierarchical path access
   const { data: user } = useRead('/user/profile')
   const { data: settings } = useRead('/user/settings')
   ```

2. **Map Database Tables to Paths**
   ```typescript
   // Migration mapping guide
   const pathMapping = {
     'users': '/user/profile',
     'user_settings': '/user/settings',
     'workspace_config': '/workspace/config',
     'project_data': '/projects/{projectId}/data',
     'team_members': '/team/members'
   }
   ```

3. **Update Data Access Code**
   ```typescript
   // Before: ORM/Database access
   class UserService {
     async getUser(userId: string) {
       return await db.users.findOne({ id: userId })
     }
     
     async updateUser(userId: string, data: UserData) {
       return await db.users.update({ id: userId }, data)
     }
   }

   // After: Hook-based access
   function UserProfile() {
     const { data: user, loading } = useRead('/user/profile')
     const { write: updateUser } = useWrite()
     
     const handleUpdate = (userData: UserData) => {
       updateUser('/user/profile', userData)
     }
     
     if (loading) return <LoadingSpinner />
     return <UserProfileForm user={user} onUpdate={handleUpdate} />
   }
   ```

4. **Batch Operation Migration**
   ```typescript
   // Before: Multiple database operations
   async function updateUserProfile(userId: string, profileData: any, settingsData: any) {
     await db.transaction(async (trx) => {
       await trx('users').where('id', userId).update(profileData)
       await trx('user_settings').where('user_id', userId).update(settingsData)
       await trx('audit_log').insert({
         user_id: userId,
         action: 'profile_update',
         timestamp: new Date()
       })
     })
   }

   // After: Atomic batch operations
   const { execute: executeBatch } = useBatch()
   
   const handleProfileUpdate = async (profileData: any, settingsData: any) => {
     const operations = [
       { type: 'write', path: '/user/profile', value: profileData },
       { type: 'write', path: '/user/settings', value: settingsData },
       { type: 'write', path: '/user/last_updated', value: new Date().toISOString() }
     ]
     
     await executeBatch(operations)
   }
   ```

#### 2. From REST API Endpoints

**Before**: Traditional REST endpoints with manual state management
**After**: Integrated hooks with automatic caching and state management

**Migration Steps:**

1. **Replace API Calls with Hooks**
   ```typescript
   // Before: Manual API calls
   useEffect(() => {
     setLoading(true)
     fetch(`/api/users/${userId}`)
       .then(res => res.json())
       .then(data => {
         setUser(data)
         setLoading(false)
       })
       .catch(err => {
         setError(err.message)
         setLoading(false)
       })
   }, [userId])

   // After: Declarative hooks
   const { data: user, loading, error } = useRead('/user/profile')
   ```

2. **Update Form Handling**
   ```typescript
   // Before: Manual form submission
   const handleSubmit = async (formData: any) => {
     setSubmitting(true)
     try {
       const response = await fetch('/api/users', {
         method: 'POST',
         body: JSON.stringify(formData)
       })
       
       if (response.ok) {
         // Manually refresh data
         await refetchUserData()
       }
     } finally {
       setSubmitting(false)
     }
   }

   // After: Hook-based submission with auto-refresh
   const { write, loading: saving } = useWrite()
   
   const handleSubmit = async (formData: any) => {
     await write('/user/profile', formData)
     // Cache automatically invalidated and data refreshed
   }
   ```

#### 3. From Local State Management (Redux/Zustand)

**Before**: Complex state management with manual synchronization
**After**: Automatic state synchronization with server

**Migration Steps:**

1. **Replace Store Selectors**
   ```typescript
   // Before: Redux selectors
   const user = useSelector((state: RootState) => state.user.profile)
   const settings = useSelector((state: RootState) => state.user.settings)
   const loading = useSelector((state: RootState) => state.user.loading)

   // After: Data hooks
   const { data: user } = useRead('/user/profile')
   const { data: settings } = useRead('/user/settings')
   ```

2. **Replace Actions with Mutations**
   ```typescript
   // Before: Redux actions
   const dispatch = useDispatch()
   
   const updateProfile = (profileData: any) => {
     dispatch(updateUserProfile(profileData))
   }

   // After: Write hooks
   const { write } = useWrite()
   
   const updateProfile = (profileData: any) => {
     write('/user/profile', profileData)
   }
   ```

3. **Handle Optimistic Updates**
   ```typescript
   // Before: Manual optimistic updates
   const updateUserName = (name: string) => {
     // Optimistic update
     dispatch(setUserName(name))
     
     // API call with rollback on error
     api.updateUser({ name })
       .catch(() => {
         dispatch(rollbackUserName())
       })
   }

   // After: Built-in optimistic updates
   const { write } = useWrite({ optimistic: true })
   
   const updateUserName = (name: string) => {
     write('/user/profile', { ...currentProfile, name })
     // Automatic rollback on error
   }
   ```

### Data Structure Migration

#### Hierarchical Path Design

1. **Design Principles**
   ```
   ✅ Good Path Structure:
   /user/profile              # User profile data
   /user/settings/theme       # Nested settings
   /user/preferences/notifications  # Deep nesting for organization
   /projects/{id}/config      # Parameterized paths
   /workspace/team/members    # Workspace-level data
   
   ❌ Poor Path Structure:
   /userProfile               # Flat, unclear
   /user_settings_theme       # Underscores instead of hierarchy
   /getUserSettings           # Verb-based (should be noun-based)
   ```

2. **Path Mapping Strategy**
   ```typescript
   // Create a path mapping document
   const DATABASE_TO_PATH_MAPPING = {
     // User data
     'users.profile': '/user/profile',
     'users.settings': '/user/settings',
     'users.preferences': '/user/preferences',
     
     // Workspace data
     'workspaces.config': '/workspace/config',
     'workspaces.members': '/workspace/members',
     'workspaces.billing': '/workspace/billing',
     
     // Project data
     'projects.metadata': '/projects/{projectId}/metadata',
     'projects.files': '/projects/{projectId}/files',
     'projects.settings': '/projects/{projectId}/settings'
   }
   ```

### Integration Testing During Migration

1. **Parallel Implementation**
   ```typescript
   // Run both old and new systems in parallel during migration
   function UserComponent() {
     // New system
     const { data: newUser } = useRead('/user/profile')
     
     // Old system (for comparison)
     const [oldUser, setOldUser] = useState(null)
     useEffect(() => {
       fetchUserLegacy().then(setOldUser)
     }, [])
     
     // Compare results in development
     useEffect(() => {
       if (process.env.NODE_ENV === 'development' && newUser && oldUser) {
         const differences = compareObjects(newUser, oldUser)
         if (differences.length > 0) {
           console.warn('Data migration differences:', differences)
         }
       }
     }, [newUser, oldUser])
     
     // Use new system data
     return <UserProfile user={newUser} />
   }
   ```

2. **Gradual Migration Strategy**
   ```typescript
   // Feature flag controlled migration
   function DataComponent() {
     const useNewDataSystem = useFeatureFlag('new-data-system')
     
     if (useNewDataSystem) {
       return <NewDataComponent />
     } else {
       return <LegacyDataComponent />
     }
   }
   ```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Authentication Issues

**Problem**: "Authentication required" errors
```
Error: Authentication required. Please sign in.
```

**Solutions**:

1. **Check Clerk Configuration**
   ```bash
   # Verify environment variables
   echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   echo $CLERK_SECRET_KEY
   ```

2. **Verify User Session**
   ```typescript
   import { useAuth } from '@clerk/nextjs'
   
   function DebugAuth() {
     const { userId, isSignedIn, sessionId } = useAuth()
     
     console.log('Auth Debug:', { userId, isSignedIn, sessionId })
     
     if (!isSignedIn) {
       return <div>Please sign in first</div>
     }
     
     if (!userId) {
       return <div>User ID not available</div>
     }
     
     return <div>Authentication OK</div>
   }
   ```

3. **Check API Route Authentication**
   ```typescript
   // In API route
   import { auth } from '@clerk/nextjs/server'
   
   export async function POST(request: NextRequest) {
     const { userId, orgId } = await auth()
     
     console.log('API Auth Debug:', { userId, orgId })
     
     if (!userId) {
       return Response.json(
         { error: 'Authentication required', debug: { userId, orgId } }, 
         { status: 401 }
       )
     }
     
     // Continue with request...
   }
   ```

#### 2. Workspace Access Issues

**Problem**: "Access denied to workspace" errors
```
Error: Access denied to workspace data
```

**Solutions**:

1. **Check Organization Context**
   ```typescript
   import { useOrganization } from '@clerk/nextjs'
   
   function DebugWorkspace() {
     const { organization, isLoaded } = useOrganization()
     
     if (!isLoaded) return <div>Loading organization...</div>
     
     if (!organization) {
       return <div>No organization selected. Please select a workspace.</div>
     }
     
     console.log('Organization:', organization.id, organization.name)
     return <div>Workspace: {organization.name}</div>
   }
   ```

2. **Verify Workspace ID Matching**
   ```typescript
   // Debug workspace ID mismatch
   function useDebugWorkspace() {
     const { organization } = useOrganization()
     const workspaceId = organization?.id
     
     useEffect(() => {
       if (workspaceId) {
         console.log('Using workspace ID:', workspaceId)
         
         // Test API call with explicit workspace ID
         fetch('/api/data/read', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             workspaceId,
             path: '/debug/test'
           })
         }).then(res => {
           console.log('Workspace API test result:', res.status)
           return res.json()
         }).then(data => {
           console.log('Workspace API response:', data)
         }).catch(err => {
           console.error('Workspace API error:', err)
         })
       }
     }, [workspaceId])
   }
   ```

#### 3. Path Validation Errors

**Problem**: "Invalid path format" errors
```
Error: Path must start with /
```

**Solutions**:

1. **Check Path Format**
   ```typescript
   // Common path format issues and fixes
   const pathExamples = {
     '❌ user/settings': '✅ /user/settings',      // Missing leading slash
     '❌ /user//settings': '✅ /user/settings',    // Double slash
     '❌ /user/settings/': '✅ /user/settings',    // Trailing slash
     '❌ /User/Settings': '✅ /user/settings',     // Case sensitivity
   }
   
   // Path validation helper
   function validateAndFixPath(path: string): string {
     if (!path.startsWith('/')) {
       path = '/' + path
     }
     
     // Remove double slashes
     path = path.replace(/\/+/g, '/')
     
     // Remove trailing slash (except root)
     if (path.length > 1 && path.endsWith('/')) {
       path = path.slice(0, -1)
     }
     
     return path
   }
   ```

2. **Debug Path Construction**
   ```typescript
   function useDebugPath(basePath: string, ...segments: string[]) {
     const path = useMemo(() => {
       const fullPath = [basePath, ...segments].join('/')
       const validatedPath = validateAndFixPath(fullPath)
       
       console.log('Path construction:', {
         basePath,
         segments,
         fullPath,
         validatedPath
       })
       
       return validatedPath
     }, [basePath, ...segments])
     
     return path
   }
   ```

#### 4. Network and Timeout Issues

**Problem**: Request timeouts or network errors
```
Error: Request timed out. Please try again.
```

**Solutions**:

1. **Check Network Configuration**
   ```typescript
   // Network diagnostic function
   async function diagnoseNetwork() {
     const tests = []
     
     // Test basic connectivity
     try {
       const response = await fetch('/api/health', { method: 'GET' })
       tests.push({ test: 'API Health', status: response.ok ? 'PASS' : 'FAIL' })
     } catch (error) {
       tests.push({ test: 'API Health', status: 'FAIL', error: error.message })
     }
     
     // Test data endpoint
     try {
       const response = await fetch('/api/data/read', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           workspaceId: 'test',
           path: '/diagnostic'
         })
       })
       tests.push({ test: 'Data API', status: response.status < 500 ? 'PASS' : 'FAIL' })
     } catch (error) {
       tests.push({ test: 'Data API', status: 'FAIL', error: error.message })
     }
     
     console.table(tests)
     return tests
   }
   ```

2. **Configure Timeouts**
   ```typescript
   // Adjust timeout settings for slower networks
   const customClient = new LambdaDataClient({
     lambdaEndpoint: process.env.DATA_LAMBDA_ENDPOINT!,
     timeoutMs: 60000, // Increase to 60 seconds
     maxRetries: 5,    // More retries
     retryBackoffMs: 2000 // Longer backoff
   })
   ```

#### 5. Cache Issues

**Problem**: Stale data or cache inconsistencies
```
Data not updating after successful write operation
```

**Solutions**:

1. **Cache Debugging**
   ```typescript
   import { dataCache } from '@/hooks/data/utils'
   
   function CacheDebugger() {
     const [cacheInfo, setCacheInfo] = useState<any>(null)
     
     const inspectCache = () => {
       const info = {
         size: (dataCache as any).cache.size,
         entries: Array.from((dataCache as any).cache.entries()).map(([key, entry]) => ({
           key,
           path: entry.path,
           workspaceId: entry.workspaceId,
           age: Date.now() - entry.timestamp,
           data: entry.data
         }))
       }
       setCacheInfo(info)
     }
     
     return (
       <div>
         <button onClick={inspectCache}>Inspect Cache</button>
         <button onClick={() => dataCache.clear()}>Clear Cache</button>
         {cacheInfo && (
           <pre>{JSON.stringify(cacheInfo, null, 2)}</pre>
         )}
       </div>
     )
   }
   ```

2. **Force Cache Refresh**
   ```typescript
   function ForceRefreshExample() {
     const { data, refresh } = useRead('/user/settings', { 
       cache: false // Disable cache for debugging
     })
     
     return (
       <div>
         <button onClick={() => refresh()}>Force Refresh</button>
         <div>{JSON.stringify(data)}</div>
       </div>
     )
   }
   ```

#### 6. Performance Issues

**Problem**: Slow data loading or high memory usage

**Solutions**:

1. **Performance Monitoring**
   ```typescript
   function usePerformanceMonitor(operationName: string) {
     const startTime = useRef<number>()
     
     const start = useCallback(() => {
       startTime.current = performance.now()
     }, [])
     
     const end = useCallback(() => {
       if (startTime.current) {
         const duration = performance.now() - startTime.current
         console.log(`${operationName} took ${duration.toFixed(2)}ms`)
         
         // Log slow operations
         if (duration > 1000) {
           console.warn(`Slow operation detected: ${operationName} (${duration.toFixed(2)}ms)`)
         }
       }
     }, [operationName])
     
     return { start, end }
   }
   
   // Usage
   function SlowComponent() {
     const monitor = usePerformanceMonitor('Data Load')
     const { data, loading } = useRead('/user/large-dataset', {
       onLoadStart: monitor.start,
       onLoadEnd: monitor.end
     })
     
     // Component implementation...
   }
   ```

2. **Memory Usage Optimization**
   ```typescript
   // Monitor cache size and clean up
   function useCacheMonitoring() {
     useEffect(() => {
       const interval = setInterval(() => {
         const cacheSize = (dataCache as any).cache.size
         
         console.log(`Cache size: ${cacheSize} entries`)
         
         // Clear cache if it gets too large
         if (cacheSize > 1000) {
           console.warn('Cache size exceeded limit, clearing old entries')
           dataCache.clear()
         }
       }, 30000) // Check every 30 seconds
       
       return () => clearInterval(interval)
     }, [])
   }
   ```

### Development Tools

#### 1. Debug Component

Create a debug component for development:

```typescript
// components/DataDebugger.tsx
import React, { useState } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'
import { useRead, useWrite } from '@/hooks/data'
import { dataCache } from '@/hooks/data/utils'

export function DataDebugger() {
  const [testPath, setTestPath] = useState('/debug/test')
  const [testValue, setTestValue] = useState('{"test": true}')
  const { userId } = useAuth()
  const { organization } = useOrganization()
  
  const { data, loading, error, refresh } = useRead(testPath)
  const { write, loading: writing } = useWrite()
  
  const handleWrite = async () => {
    try {
      const value = JSON.parse(testValue)
      await write(testPath, value)
      await refresh()
    } catch (err) {
      console.error('Write failed:', err)
    }
  }
  
  const clearCache = () => {
    dataCache.clear()
    console.log('Cache cleared')
  }
  
  return (
    <div style={{ padding: 20, border: '1px solid #ccc', margin: 10 }}>
      <h3>Data Infrastructure Debugger</h3>
      
      <div>
        <strong>Auth Status:</strong>
        <ul>
          <li>User ID: {userId || 'None'}</li>
          <li>Organization: {organization?.id || 'None'}</li>
        </ul>
      </div>
      
      <div>
        <label>Test Path: </label>
        <input 
          value={testPath} 
          onChange={(e) => setTestPath(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      
      <div>
        <label>Test Value: </label>
        <input 
          value={testValue} 
          onChange={(e) => setTestValue(e.target.value)}
          style={{ width: 300 }}
        />
        <button onClick={handleWrite} disabled={writing}>
          {writing ? 'Writing...' : 'Write'}
        </button>
      </div>
      
      <div>
        <button onClick={() => refresh()} disabled={loading}>
          {loading ? 'Loading...' : 'Read'}
        </button>
        <button onClick={clearCache}>Clear Cache</button>
      </div>
      
      <div>
        <strong>Result:</strong>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      </div>
    </div>
  )
}
```

#### 2. Environment Configuration Checker

```typescript
// utils/configChecker.ts
export function checkConfiguration() {
  const config = {
    clerk: {
      publishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      secretKey: !!process.env.CLERK_SECRET_KEY,
    },
    dataInfra: {
      endpoint: process.env.DATA_LAMBDA_ENDPOINT || 'http://localhost:2024',
      apiKey: !!process.env.DATA_API_KEY,
    },
    environment: process.env.NODE_ENV
  }
  
  const issues = []
  
  if (!config.clerk.publishableKey) {
    issues.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set')
  }
  
  if (!config.clerk.secretKey) {
    issues.push('CLERK_SECRET_KEY is not set')
  }
  
  if (!config.dataInfra.endpoint.startsWith('http')) {
    issues.push('DATA_LAMBDA_ENDPOINT is not a valid URL')
  }
  
  console.log('Configuration Check:', config)
  
  if (issues.length > 0) {
    console.error('Configuration Issues:', issues)
  } else {
    console.log('✅ Configuration looks good!')
  }
  
  return { config, issues }
}
```

### Production Deployment Issues

#### 1. Environment Variable Issues

**Problem**: Configuration not working in production

**Solution**:
```bash
# Verify production environment variables
echo "Checking production config..."
echo "Clerk Publishable Key: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:0:10}..."
echo "Data Endpoint: $DATA_LAMBDA_ENDPOINT"
echo "Environment: $NODE_ENV"

# Test configuration loading
node -e "
  const config = {
    clerk: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    endpoint: process.env.DATA_LAMBDA_ENDPOINT,
    node_env: process.env.NODE_ENV
  };
  console.log('Production config:', config);
  
  const issues = [];
  if (!config.clerk) issues.push('Missing Clerk key');
  if (!config.endpoint) issues.push('Missing data endpoint');
  
  if (issues.length > 0) {
    console.error('Issues found:', issues);
    process.exit(1);
  } else {
    console.log('✅ Production config valid');
  }
"
```

#### 2. CORS Issues

**Problem**: Cross-origin request blocked

**Solution**:
```typescript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGINS || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig
```

This comprehensive migration and troubleshooting guide provides practical solutions for common issues encountered when implementing the Tree Chat data infrastructure. The guide covers migration from existing systems, debugging techniques, and production deployment considerations.