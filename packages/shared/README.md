# @tree-chat/shared

Shared types, interfaces, and utilities for the Tree Chat data infrastructure. This package provides type definitions and common constants that are used across the monorepo, particularly by the data-client package and API routes.

## Overview

The shared package contains:
- **Core data access interfaces** - Defining contracts for data operations
- **Session context types** - Authentication and workspace management types
- **Validation utilities** - Type definitions for input validation and security
- **Common enums and constants** - Shared across all packages

## Installation

This package is part of the Tree Chat monorepo and should be installed automatically via pnpm workspaces:

```bash
pnpm install
```

## Package Structure

```
packages/shared/
├── src/
│   ├── index.ts              # Main exports
│   └── types/
│       ├── data-access.ts    # Data client interfaces
│       ├── session-context.ts # Authentication types
│       └── validation.ts     # Validation utilities
├── package.json
├── tsconfig.json
└── README.md
```

## Core Types

### Data Access Types (`data-access.ts`)

#### DataClient Interface

The main interface that all data clients must implement:

```typescript
import { DataClient, DataResponse } from '@tree-chat/shared'

const client: DataClient = {
  async read(workspaceId: string, path: string, userId: string): Promise<DataResponse<any>> {
    // Implementation
  },
  async write(workspaceId: string, path: string, value: any, userId: string): Promise<void> {
    // Implementation
  },
  async readTree(workspaceId: string, pathPrefix: string, userId: string): Promise<TreeResponse> {
    // Implementation
  },
  async batch(workspaceId: string, operations: BatchOperation[], userId: string): Promise<BatchResponse[]> {
    // Implementation
  }
}
```

#### Key Interfaces

- **`DataResponse<T>`** - Standard response wrapper with nullable-first design
- **`TreeResponse`** - Hierarchical data structure for tree operations
- **`BatchOperation`** - Atomic transaction operations
- **`DataClientConfig`** - Configuration options for data clients
- **`AuditLog`** - Audit trail for data modifications

### Session Context Types (`session-context.ts`)

#### SessionContext Interface

Represents authenticated user and workspace context:

```typescript
import { SessionContext, WorkspaceId, UserId } from '@tree-chat/shared'

const context: SessionContext = {
  userId: 'user_123',
  workspaceId: 'workspace_456',
  expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  permissions: ['read', 'write'],
  sessionToken: 'encrypted_token_here'
}
```

#### Key Types

- **`WorkspaceId`** - Type-safe workspace identifier
- **`UserId`** - Type-safe user identifier
- **`SecureSessionContext`** - Validated session with security checks
- **`WorkspaceAccessContext`** - Workspace-specific access controls

### Validation Types (`validation.ts`)

#### Validation Utilities

Type definitions for input validation and security:

```typescript
import { ValidationError, PathValidationResult, ValidationErrorCode } from '@tree-chat/shared'

// Path validation example
const pathValidation: PathValidationResult = {
  isValid: true,
  validatedPath: '/user/settings',
  errors: [],
  warnings: []
}

// Error handling
if (!pathValidation.isValid) {
  console.error('Validation failed:', pathValidation.errors)
}
```

#### Security Features

- **Path traversal prevention** - Validates paths to prevent directory traversal attacks
- **Unicode support** - Proper handling of international characters in paths
- **Length validation** - DynamoDB 1KB path limit enforcement
- **Character restrictions** - Security-focused character filtering

## Usage Examples

### Basic Import

```typescript
// Import specific types
import { DataClient, SessionContext, ValidationError } from '@tree-chat/shared'

// Import everything
import * as SharedTypes from '@tree-chat/shared'
```

### Type Guards

```typescript
import { ValidationErrorCode, ValidationSeverity } from '@tree-chat/shared'

function isSecurityError(code: ValidationErrorCode): boolean {
  return code === ValidationErrorCode.PATH_TRAVERSAL || 
         code === ValidationErrorCode.UNSAFE_CHARACTERS
}
```

### Configuration Example

```typescript
import { DataClientConfig, PathValidationConfig } from '@tree-chat/shared'

const config: DataClientConfig = {
  enableAuditLogging: true,
  maxRetries: 3,
  timeoutMs: 30000,
  validation: {
    maxPathLength: 1024,
    allowUnicode: true,
    restrictedCharacters: ['<', '>', '|', ':', '*', '?', '"']
  } as PathValidationConfig
}
```

## Design Principles

### Nullable-First Design

All data operations follow a nullable-first approach where null values are explicitly handled:

```typescript
// DataResponse always includes explicit null handling
interface DataResponse<T> {
  value: T | null      // Explicit null for missing data
  exists: boolean      // Clear existence indicator
  lastModified?: Date  // Optional metadata
}
```

### Type Safety

The package emphasizes strict TypeScript typing:

```typescript
// Branded types for enhanced type safety
type WorkspaceId = string & { __brand: 'WorkspaceId' }
type UserId = string & { __brand: 'UserId' }

// Type guards for runtime validation
function isWorkspaceId(value: string): value is WorkspaceId {
  return /^ws_[a-zA-Z0-9_-]+$/.test(value)
}
```

### Security First

All validation types include security considerations:

```typescript
interface SecurityConstraints {
  preventPathTraversal: boolean
  maxPathLength: number
  allowedFileExtensions: string[]
  blockedPatterns: RegExp[]
}
```

## Error Handling

### Validation Errors

```typescript
import { ValidationError, ValidationErrorCode, ValidationSeverity } from '@tree-chat/shared'

const error: ValidationError = {
  code: ValidationErrorCode.PATH_TOO_LONG,
  message: 'Path exceeds maximum length of 1024 characters',
  severity: ValidationSeverity.ERROR,
  field: 'path',
  value: '/very/long/path/that/exceeds/limits...'
}
```

### Error Categories

- **`ValidationErrorCode`** - Enumerated error codes for different validation failures
- **`ValidationSeverity`** - Error severity levels (ERROR, WARNING, INFO)
- **Authentication errors** - Session and permission-related failures
- **Data access errors** - Database and storage-related issues

## Integration with Other Packages

### Data Client Integration

```typescript
// packages/data-client uses shared types
import { DataClient, DataResponse } from '@tree-chat/shared'

class LambdaDataClient implements DataClient {
  // Implementation using shared interfaces
}
```

### API Route Integration

```typescript
// apps/web/src/app/api/data/read/route.ts
import { SessionContext, ValidationError } from '@tree-chat/shared'

export async function POST(request: Request) {
  const context: SessionContext = await extractSessionContext(request)
  // Use shared types throughout API implementation
}
```

## Development

### Building the Package

```bash
# Build TypeScript to dist/
pnpm build

# Type checking only
pnpm type-check

# Clean build artifacts
pnpm clean
```

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Linting

```bash
# Check code style
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Exports

The package provides both named and default exports:

```typescript
// Named exports (recommended)
import { DataClient, SessionContext } from '@tree-chat/shared'

// Type-only imports (for better tree-shaking)
import type { DataResponse, ValidationError } from '@tree-chat/shared'

// Enum imports (values, not types)
import { ValidationErrorCode, ValidationSeverity } from '@tree-chat/shared'
```

## Path Mapping

When used in the monorepo, TypeScript path mapping is configured:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@tree-chat/shared": ["packages/shared/src"],
      "@tree-chat/shared/*": ["packages/shared/src/*"]
    }
  }
}
```

## Versioning

This package follows semantic versioning and is currently in pre-release (0.x.x). Breaking changes may occur between minor versions until 1.0.0 is reached.

## Contributing

When adding new types to this package:

1. Follow existing patterns for nullable-first design
2. Include comprehensive JSDoc comments
3. Add type guards where appropriate
4. Consider security implications
5. Update exports in `index.ts`
6. Add usage examples to this README

## Related Packages

- **[@tree-chat/data-client](../data-client/README.md)** - Data client implementation using these types
- **[Web App Data Hooks](../../apps/web/src/hooks/data/README.md)** - React hooks built on this infrastructure
- **[API Routes](../../apps/web/src/app/api/data/README.md)** - HTTP API using shared types