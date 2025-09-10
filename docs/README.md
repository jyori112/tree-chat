# Data Infrastructure Documentation

Comprehensive documentation for the Tree Chat data infrastructure, providing hierarchical data storage with workspace isolation, type-safe APIs, and React integration.

## Quick Start

1. **[Architecture Overview](./data-infrastructure-architecture.md)** - System design and component interactions
2. **[Configuration Guide](./data-infrastructure-configuration.md)** - Environment setup and deployment configuration
3. **[Migration & Troubleshooting](./data-infrastructure-migration-troubleshooting.md)** - Common issues and solutions

## Package Documentation

### Core Packages

- **[@tree-chat/shared](../packages/shared/README.md)** - Shared types and interfaces
- **[@tree-chat/data-client](../packages/data-client/README.md)** - Data client library with Lambda integration

### Web Application

- **[API Routes](../apps/web/src/app/api/data/README.md)** - HTTP API endpoints with examples
- **[React Hooks](../apps/web/src/hooks/data/README.md)** - Frontend data access hooks
- **[Data Provider](../apps/web/src/providers/data/README.md)** - React context for data management

## Quick Reference

### Basic Usage

```typescript
import { useRead, useWrite } from '@/hooks/data'

function UserProfile() {
  const { data: profile, loading } = useRead('/user/profile')
  const { write } = useWrite()
  
  const handleUpdate = (newProfile: any) => {
    write('/user/profile', newProfile)
  }
  
  if (loading) return <div>Loading...</div>
  return <ProfileForm data={profile} onUpdate={handleUpdate} />
}
```

### Configuration

```bash
# Required environment variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
DATA_LAMBDA_ENDPOINT=https://api.your-domain.com
```

### Path Structure

```
/user/profile              # User profile data
/user/settings/theme       # Nested configuration
/projects/{id}/files       # Parameterized paths
/workspace/team/members    # Workspace-level data
```

## Documentation Index

### Architecture & Design
- [System Architecture](./data-infrastructure-architecture.md) - Complete system design with diagrams
- [Security Model](./data-infrastructure-architecture.md#security-architecture) - Authentication and authorization
- [Performance Characteristics](./data-infrastructure-architecture.md#performance-architecture) - SLA targets and optimization

### Configuration & Deployment
- [Environment Variables](./data-infrastructure-configuration.md#environment-variables) - All configuration options
- [Performance Tuning](./data-infrastructure-configuration.md#performance-tuning) - Optimization settings
- [Security Configuration](./data-infrastructure-configuration.md#security-configuration) - Production security setup
- [Monitoring Setup](./data-infrastructure-configuration.md#monitoring-configuration) - Observability configuration

### Implementation Guides
- [API Integration](../apps/web/src/app/api/data/README.md) - HTTP endpoint usage
- [React Hooks Guide](../apps/web/src/hooks/data/README.md) - Frontend integration patterns
- [Batch Operations](../apps/web/src/hooks/data/README.md#5-usebatch) - Atomic transactions
- [Tree Queries](../apps/web/src/hooks/data/README.md#4-usereadtree) - Hierarchical data access

### Migration & Troubleshooting
- [Migration from Database Access](./data-infrastructure-migration-troubleshooting.md#1-from-direct-database-access) - Moving from ORM/SQL
- [Migration from REST APIs](./data-infrastructure-migration-troubleshooting.md#2-from-rest-api-endpoints) - Replacing manual API calls
- [Common Issues](./data-infrastructure-migration-troubleshooting.md#common-issues-and-solutions) - Problem diagnosis
- [Debug Tools](./data-infrastructure-migration-troubleshooting.md#development-tools) - Debugging components

### API Reference
- [Data Client Interface](../packages/data-client/README.md#core-features) - LambdaDataClient methods
- [Shared Types](../packages/shared/README.md#core-types) - TypeScript interfaces
- [Validation Utils](../packages/data-client/README.md#2-validation-system) - Path and input validation
- [Error Handling](../apps/web/src/app/api/data/README.md#error-handling) - Error response formats

## Key Features

### 🏗️ Architecture
- **Serverless Backend** - AWS Lambda + DynamoDB for infinite scale
- **Workspace Isolation** - Complete data segregation between organizations
- **Type Safety** - Full TypeScript support from database to UI
- **Hierarchical Paths** - Intuitive `/user/settings/theme` structure

### 🔒 Security
- **Authentication** - Clerk integration with JWT tokens
- **Authorization** - Workspace-level access control
- **Validation** - Input sanitization and path traversal prevention
- **Audit Logging** - Complete operation tracking

### ⚡ Performance
- **Caching** - Intelligent multi-layer caching with TTL
- **Optimistic Updates** - Immediate UI feedback with rollback
- **Connection Pooling** - Efficient resource utilization  
- **Batch Operations** - Atomic multi-operation transactions

### 🎯 Developer Experience
- **React Hooks** - Declarative data access with `useRead`, `useWrite`
- **Automatic State** - Loading, error, and cache management
- **TypeScript** - Full type inference and safety
- **Hot Reloading** - Development-friendly with instant updates

## Getting Started

### 1. Installation
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### 2. Configuration
Create `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATA_LAMBDA_ENDPOINT=http://localhost:2024
```

### 3. Basic Integration
```typescript
// Read user data
const { data, loading, error } = useRead('/user/profile')

// Write user data
const { write } = useWrite()
await write('/user/settings', { theme: 'dark' })

// Query hierarchical data
const { items } = useReadTree('/user')

// Batch operations
const { execute } = useBatch()
await execute([
  { type: 'write', path: '/user/name', value: 'John' },
  { type: 'read', path: '/user/id' }
])
```

## Support

### Documentation
- All packages include comprehensive README files
- JSDoc comments on all public APIs
- Extensive examples and usage patterns
- Migration guides for existing systems

### Debugging
- Built-in debug components for development
- Configuration validation helpers
- Network diagnostic tools
- Performance monitoring utilities

### Best Practices
- Path structure guidelines
- Error handling patterns
- Performance optimization tips
- Security configuration guides

## Contributing

When contributing to the data infrastructure:

1. **Follow existing patterns** - Consistent API design
2. **Add comprehensive tests** - Unit, integration, and E2E
3. **Update documentation** - Keep README files current
4. **Include examples** - Practical usage demonstrations
5. **Consider security** - Validate inputs, prevent traversal

## Related Projects

- **[Tree Chat Web App](../apps/web/)** - Next.js frontend application
- **[LangGraph Agents](../apps/agents/)** - AI agent backend services
- **[Shared Components](../packages/shared/)** - Common utilities and types

---

The Tree Chat data infrastructure provides a modern, scalable foundation for collaborative applications with hierarchical data needs. The comprehensive documentation ensures successful implementation and maintenance across development teams.