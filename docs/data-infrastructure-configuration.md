# Data Infrastructure Configuration

Comprehensive configuration guide for the Tree Chat data infrastructure, including environment variables, deployment settings, performance tuning, and security configuration.

## Overview

The data infrastructure supports multiple deployment environments with extensive configuration options for performance, security, and operational requirements. Configuration is managed through environment variables, with different settings for development, staging, and production environments.

## Environment Variables

### Required Variables

#### Clerk Authentication
```bash
# Required for all environments
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Development example
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Description**: Clerk authentication keys for user management and workspace isolation.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Client-side key (public, embedded in frontend)
- `CLERK_SECRET_KEY`: Server-side key (private, used in API routes and Lambda functions)

#### Data Infrastructure
```bash
# Required for production
DATA_LAMBDA_ENDPOINT=https://your-lambda-api-gateway.execute-api.us-east-1.amazonaws.com

# Development fallback
DATA_LAMBDA_ENDPOINT=http://localhost:2024

# Optional API key for Lambda authentication
DATA_API_KEY=your-lambda-api-key-for-additional-security
```

**Description**: Lambda endpoints for data operations.
- `DATA_LAMBDA_ENDPOINT`: Base URL for AWS Lambda functions via API Gateway
- `DATA_API_KEY`: Optional additional authentication for Lambda functions

### Optional Variables

#### Performance Configuration
```bash
# Data client timeouts (milliseconds)
DATA_CLIENT_TIMEOUT=30000                    # Default: 30000 (30 seconds)
DATA_CLIENT_CONNECTION_TIMEOUT=10000         # Default: 10000 (10 seconds)
DATA_CLIENT_IDLE_TIMEOUT=300000             # Default: 300000 (5 minutes)

# Retry configuration
DATA_CLIENT_MAX_RETRIES=3                   # Default: 3
DATA_CLIENT_RETRY_BASE_DELAY=1000          # Default: 1000ms
DATA_CLIENT_RETRY_MAX_DELAY=10000          # Default: 10000ms

# Connection pooling
DATA_CLIENT_MAX_CONNECTIONS=50              # Default: 50
DATA_CLIENT_CONNECTION_REUSE=true          # Default: true
```

#### Cache Configuration
```bash
# React Query cache settings
DATA_CACHE_DEFAULT_TTL=300000              # Default: 5 minutes
DATA_CACHE_TREE_TTL=120000                 # Default: 2 minutes for tree queries
DATA_CACHE_MAX_SIZE=1000                   # Default: 1000 entries
DATA_CACHE_CLEANUP_INTERVAL=60000          # Default: 1 minute

# Browser cache settings
DATA_BROWSER_CACHE_ENABLED=true           # Default: true
DATA_BROWSER_CACHE_SIZE=50                # Default: 50MB
```

#### Monitoring and Logging
```bash
# Logging configuration
LOG_LEVEL=info                            # Default: info (error, warn, info, debug)
LOG_FORMAT=json                           # Default: json (json, text)
LOG_STRUCTURED=true                       # Default: true

# Audit logging
AUDIT_LOG_ENABLED=true                    # Default: true in production
AUDIT_LOG_RETENTION_DAYS=90               # Default: 90 days
AUDIT_LOG_SENSITIVE_DATA=false            # Default: false

# Performance monitoring
PERFORMANCE_MONITORING_ENABLED=true       # Default: true in production
PERFORMANCE_SAMPLE_RATE=0.1               # Default: 10% sampling
```

#### Security Configuration
```bash
# Security settings
SECURITY_RATE_LIMIT_ENABLED=true          # Default: true
SECURITY_RATE_LIMIT_READ_RPM=1000         # Default: 1000 requests per minute
SECURITY_RATE_LIMIT_WRITE_RPM=500         # Default: 500 requests per minute
SECURITY_RATE_LIMIT_BATCH_RPM=100         # Default: 100 requests per minute

# Path validation
SECURITY_MAX_PATH_LENGTH=1024             # Default: 1024 characters
SECURITY_ALLOW_UNICODE_PATHS=true         # Default: true
SECURITY_BLOCKED_PATH_PATTERNS="__proto__,constructor,prototype"

# Content security
SECURITY_MAX_PAYLOAD_SIZE=1048576         # Default: 1MB
SECURITY_CONTENT_TYPE_VALIDATION=true     # Default: true
```

#### Development and Testing
```bash
# Development settings
NODE_ENV=development                      # development, staging, production
DEBUG=true                                # Enable debug logging
MOCK_DATA_CLIENT=false                    # Use mock data client for testing

# Testing configuration
TEST_EMAIL=user@example.com               # Test user email for E2E tests
TEST_PASSWORD=TestPassword123!            # Test user password
TEST_WORKSPACE_ID=org_test123             # Test workspace ID

# Feature flags
FEATURE_REAL_TIME_SYNC=false             # Enable WebSocket sync (future)
FEATURE_ADVANCED_CACHING=false           # Enable advanced caching strategies
FEATURE_ANALYTICS=false                  # Enable usage analytics
```

## Environment-Specific Configuration

### Development Environment

Create `.env.local` in the web app root:
```bash
# .env.local (development)

# Clerk (development keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Data infrastructure (local development)
DATA_LAMBDA_ENDPOINT=http://localhost:2024
DATA_API_KEY=dev-api-key

# Development settings
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug

# Cache settings (shorter TTL for development)
DATA_CACHE_DEFAULT_TTL=60000              # 1 minute
DATA_CACHE_TREE_TTL=30000                 # 30 seconds

# Disable rate limiting for development
SECURITY_RATE_LIMIT_ENABLED=false

# Feature flags for development
FEATURE_REAL_TIME_SYNC=true
FEATURE_ADVANCED_CACHING=true
MOCK_DATA_CLIENT=false
```

### Staging Environment

```bash
# .env.staging

# Clerk (staging keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Data infrastructure (staging Lambda)
DATA_LAMBDA_ENDPOINT=https://staging-api.your-domain.com
DATA_API_KEY=staging-secure-api-key

# Staging settings
NODE_ENV=staging
LOG_LEVEL=info
LOG_FORMAT=json

# Performance settings (production-like)
DATA_CLIENT_TIMEOUT=30000
DATA_CLIENT_MAX_RETRIES=3
DATA_CLIENT_MAX_CONNECTIONS=50

# Cache settings (production-like)
DATA_CACHE_DEFAULT_TTL=300000             # 5 minutes
DATA_CACHE_TREE_TTL=120000                # 2 minutes

# Security settings (production-like)
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_RATE_LIMIT_READ_RPM=1000
SECURITY_RATE_LIMIT_WRITE_RPM=500

# Monitoring enabled
AUDIT_LOG_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_SAMPLE_RATE=1.0               # 100% sampling in staging
```

### Production Environment

```bash
# .env.production

# Clerk (production keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Data infrastructure (production Lambda)
DATA_LAMBDA_ENDPOINT=https://api.your-domain.com
DATA_API_KEY=production-secure-api-key-with-high-entropy

# Production settings
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_STRUCTURED=true

# Performance settings (optimized)
DATA_CLIENT_TIMEOUT=30000
DATA_CLIENT_CONNECTION_TIMEOUT=10000
DATA_CLIENT_MAX_RETRIES=3
DATA_CLIENT_RETRY_BASE_DELAY=1000
DATA_CLIENT_MAX_CONNECTIONS=100           # Higher for production

# Cache settings (optimized)
DATA_CACHE_DEFAULT_TTL=300000             # 5 minutes
DATA_CACHE_TREE_TTL=120000                # 2 minutes
DATA_CACHE_MAX_SIZE=2000                  # Larger cache
DATA_CACHE_CLEANUP_INTERVAL=30000         # More frequent cleanup

# Security settings (strict)
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_RATE_LIMIT_READ_RPM=1000
SECURITY_RATE_LIMIT_WRITE_RPM=500
SECURITY_RATE_LIMIT_BATCH_RPM=100
SECURITY_MAX_PATH_LENGTH=1024
SECURITY_MAX_PAYLOAD_SIZE=1048576
SECURITY_CONTENT_TYPE_VALIDATION=true

# Monitoring (comprehensive)
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365              # 1 year retention
AUDIT_LOG_SENSITIVE_DATA=false
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_SAMPLE_RATE=0.1               # 10% sampling

# Feature flags (stable features only)
FEATURE_REAL_TIME_SYNC=false              # Disabled until stable
FEATURE_ADVANCED_CACHING=true
FEATURE_ANALYTICS=true
```

## Configuration Validation

### Validation Function

The application includes configuration validation to ensure all required settings are present and valid:

```typescript
// apps/web/src/lib/config-validator.ts
interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateConfiguration(): ConfigValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required Clerk configuration
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    errors.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required')
  }
  if (!process.env.CLERK_SECRET_KEY) {
    errors.push('CLERK_SECRET_KEY is required')
  }

  // Data infrastructure
  if (!process.env.DATA_LAMBDA_ENDPOINT) {
    warnings.push('DATA_LAMBDA_ENDPOINT not set, using default localhost:2024')
  }

  // Validate timeout values
  const timeout = parseInt(process.env.DATA_CLIENT_TIMEOUT || '30000')
  if (timeout < 5000 || timeout > 120000) {
    warnings.push(`DATA_CLIENT_TIMEOUT (${timeout}) should be between 5000-120000ms`)
  }

  // Validate cache settings
  const cacheTTL = parseInt(process.env.DATA_CACHE_DEFAULT_TTL || '300000')
  if (cacheTTL < 30000) {
    warnings.push(`DATA_CACHE_DEFAULT_TTL (${cacheTTL}) is very low, may impact performance`)
  }

  return { isValid: errors.length === 0, errors, warnings }
}
```

### Startup Validation

```typescript
// apps/web/src/app/layout.tsx
import { validateConfiguration } from '@/lib/config-validator'

export default function RootLayout({ children }) {
  // Validate configuration on startup
  if (typeof window === 'undefined') { // Server-side only
    const validation = validateConfiguration()
    
    if (!validation.isValid) {
      console.error('Configuration errors:', validation.errors)
      throw new Error('Invalid configuration: ' + validation.errors.join(', '))
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings)
    }
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

## Performance Tuning

### Client-Side Performance

#### React Query Configuration
```typescript
// apps/web/src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: parseInt(process.env.DATA_CACHE_DEFAULT_TTL || '300000'),
      gcTime: parseInt(process.env.DATA_CACHE_DEFAULT_TTL || '300000') * 2,
      retry: (failureCount, error) => {
        // Don't retry client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => {
        const baseDelay = parseInt(process.env.DATA_CLIENT_RETRY_BASE_DELAY || '1000')
        return Math.min(baseDelay * Math.pow(2, attemptIndex), 10000)
      }
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => {
        const baseDelay = parseInt(process.env.DATA_CLIENT_RETRY_BASE_DELAY || '1000')
        return Math.min(baseDelay * Math.pow(2, attemptIndex), 10000)
      }
    }
  }
})
```

#### Connection Pooling
```typescript
// packages/data-client/src/lambda-client.ts
export class LambdaDataClient implements DataClient {
  private httpAgent: Agent

  constructor(config: LambdaClientConfig) {
    // Configure connection pooling
    const maxConnections = parseInt(process.env.DATA_CLIENT_MAX_CONNECTIONS || '50')
    const idleTimeout = parseInt(process.env.DATA_CLIENT_IDLE_TIMEOUT || '300000')

    this.httpAgent = new Agent({
      keepAlive: true,
      maxSockets: maxConnections,
      maxFreeSockets: Math.floor(maxConnections / 2),
      timeout: idleTimeout,
      freeSocketTimeout: idleTimeout
    })
  }
}
```

### Lambda Function Performance

#### Cold Start Optimization
```typescript
// infrastructure/lambda/shared/warm-client.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

// Global client instance (reused across warm invocations)
let dynamoClient: DynamoDBClient | null = null

export function getDynamoClient(): DynamoDBClient {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: parseInt(process.env.DATA_CLIENT_MAX_RETRIES || '3'),
      requestHandler: {
        connectionTimeout: parseInt(process.env.DATA_CLIENT_CONNECTION_TIMEOUT || '10000'),
        socketTimeout: parseInt(process.env.DATA_CLIENT_TIMEOUT || '30000')
      }
    })
  }
  return dynamoClient
}
```

#### Connection Keep-Alive
```bash
# Lambda environment variables
AWS_LAMBDA_LOG_LEVEL=WARN                 # Reduce logging overhead
AWS_NODEJS_CONNECTION_REUSE_ENABLED=1     # Enable connection reuse
```

### Database Performance

#### DynamoDB Configuration
```bash
# DynamoDB performance settings
DYNAMODB_READ_CAPACITY_UNITS=100          # Base read capacity
DYNAMODB_WRITE_CAPACITY_UNITS=100         # Base write capacity
DYNAMODB_AUTO_SCALING_ENABLED=true        # Enable auto-scaling
DYNAMODB_AUTO_SCALING_MIN_CAPACITY=5      # Minimum capacity
DYNAMODB_AUTO_SCALING_MAX_CAPACITY=1000   # Maximum capacity
DYNAMODB_AUTO_SCALING_TARGET_UTILIZATION=70  # Target utilization %
```

#### Monitoring Thresholds
```bash
# CloudWatch alarms
PERFORMANCE_ALARM_READ_LATENCY_P95=200    # 200ms p95 read latency alarm
PERFORMANCE_ALARM_WRITE_LATENCY_P95=200   # 200ms p95 write latency alarm
PERFORMANCE_ALARM_ERROR_RATE=5            # 5% error rate alarm
PERFORMANCE_ALARM_THROTTLE_RATE=1         # 1% throttle rate alarm
```

## Security Configuration

### Authentication Security
```bash
# Clerk security settings
CLERK_SESSION_TIMEOUT=86400000            # 24 hours (milliseconds)
CLERK_JWT_VERIFICATION_ENABLED=true       # Always verify JWT tokens
CLERK_REQUIRE_MFA=false                   # Require multi-factor auth

# API security
API_CORS_ORIGINS="https://your-domain.com,https://staging.your-domain.com"
API_TRUSTED_IPS=""                        # Comma-separated trusted IPs (optional)
```

### Data Security
```bash
# Encryption settings
DYNAMODB_ENCRYPTION_AT_REST=true          # Enable encryption at rest
DYNAMODB_KMS_KEY_ID=""                    # Custom KMS key (optional)

# SSL/TLS settings
TLS_MIN_VERSION=1.2                       # Minimum TLS version
FORCE_HTTPS=true                          # Redirect HTTP to HTTPS

# Content security
CONTENT_SECURITY_POLICY_ENABLED=true      # Enable CSP headers
CONTENT_SECURITY_POLICY_REPORT_ONLY=false # Enforce CSP (not just report)
```

### Audit Configuration
```bash
# Audit logging detail levels
AUDIT_LOG_INCLUDE_REQUEST_BODY=false      # Don't log request bodies (privacy)
AUDIT_LOG_INCLUDE_RESPONSE_BODY=false     # Don't log response bodies (privacy)
AUDIT_LOG_INCLUDE_IP_ADDRESS=true         # Log client IP addresses
AUDIT_LOG_INCLUDE_USER_AGENT=true         # Log user agents

# Compliance settings
AUDIT_LOG_IMMUTABLE=true                  # Write-only audit logs
AUDIT_LOG_ENCRYPTION=true                 # Encrypt audit logs
AUDIT_LOG_BACKUP_ENABLED=true             # Enable audit log backups
```

## Monitoring Configuration

### Application Monitoring
```bash
# Application metrics
METRICS_ENABLED=true                      # Enable application metrics
METRICS_ENDPOINT="/api/metrics"           # Metrics endpoint
METRICS_INCLUDE_SYSTEM=true               # Include system metrics

# Business metrics
METRICS_TRACK_USER_ACTIONS=true           # Track user interactions
METRICS_TRACK_DATA_OPERATIONS=true        # Track data CRUD operations
METRICS_TRACK_PERFORMANCE=true            # Track performance metrics
```

### Infrastructure Monitoring
```bash
# AWS CloudWatch
CLOUDWATCH_ENABLED=true                   # Enable CloudWatch integration
CLOUDWATCH_NAMESPACE="TreeChat/DataInfra"  # Custom namespace
CLOUDWATCH_LOG_GROUP="/aws/lambda/tree-chat-data"

# Custom dashboards
DASHBOARD_ENABLED=true                    # Enable monitoring dashboard
DASHBOARD_REFRESH_INTERVAL=30000          # 30 second refresh
DASHBOARD_ALERT_THRESHOLDS="error_rate:5,latency_p95:500"
```

### Alerting Configuration
```bash
# Alert channels
ALERT_EMAIL_ENABLED=true                  # Enable email alerts
ALERT_EMAIL_RECIPIENTS="ops@your-domain.com,dev@your-domain.com"
ALERT_SLACK_ENABLED=false                 # Enable Slack notifications
ALERT_SLACK_WEBHOOK_URL=""                # Slack webhook URL

# Alert thresholds
ALERT_ERROR_RATE_THRESHOLD=5              # 5% error rate
ALERT_LATENCY_THRESHOLD_P95=500           # 500ms p95 latency
ALERT_THROUGHPUT_THRESHOLD=1000           # 1000 req/min
```

## Deployment Configuration

### Build Configuration
```bash
# Next.js build settings
NEXT_BUILD_STANDALONE=true                # Standalone build for containers
NEXT_BUILD_OUTPUT_EXPORT=false            # Don't export static files
NEXT_BUILD_ANALYZE=false                  # Bundle analyzer (dev only)
NEXT_BUILD_EXPERIMENTAL_PPR=false         # Partial prerendering

# TypeScript build settings
TS_BUILD_STRICT=true                      # Strict TypeScript compilation
TS_BUILD_SOURCE_MAPS=true                 # Generate source maps
```

### Container Configuration
```bash
# Docker settings
DOCKER_NODE_VERSION=18-alpine             # Node.js version
DOCKER_EXPOSED_PORT=3000                  # Container port
DOCKER_HEALTH_CHECK_ENABLED=true          # Enable health checks
DOCKER_HEALTH_CHECK_INTERVAL=30s          # Health check interval

# Resource limits
DOCKER_MEMORY_LIMIT=512m                  # Memory limit
DOCKER_CPU_LIMIT=0.5                      # CPU limit
```

### Infrastructure as Code
```bash
# AWS CDK configuration
CDK_STACK_NAME="tree-chat-data-infrastructure"
CDK_ENVIRONMENT="production"              # development, staging, production
CDK_REGION="us-east-1"                    # AWS region
CDK_ACCOUNT=""                            # AWS account ID

# Resource tagging
AWS_TAGS="Environment=production,Project=tree-chat,Team=engineering"
```

## Configuration Best Practices

### Security Best Practices

1. **Never commit secrets** - Use `.env.local` and `.gitignore`
2. **Use different keys per environment** - Separate development/staging/production
3. **Rotate keys regularly** - Implement key rotation policies
4. **Validate configuration on startup** - Fail fast on missing/invalid config
5. **Use least privilege principles** - Only grant necessary permissions

### Performance Best Practices

1. **Tune cache TTL based on data volatility** - Longer TTL for stable data
2. **Configure connection pooling** - Reuse connections for better performance
3. **Set appropriate timeouts** - Balance responsiveness with reliability
4. **Monitor and adjust** - Use metrics to optimize configuration
5. **Use environment-specific settings** - Different settings per environment

### Operational Best Practices

1. **Use structured configuration** - Group related settings
2. **Document all variables** - Include purpose and valid ranges
3. **Implement configuration validation** - Catch issues early
4. **Version configuration changes** - Track configuration history
5. **Automate configuration deployment** - Reduce manual errors

## Configuration Templates

### Quick Start Template (.env.local)
```bash
# Copy this template to .env.local and update with your values

# Clerk Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Data Infrastructure
DATA_LAMBDA_ENDPOINT=http://localhost:2024
DATA_API_KEY=dev-api-key

# Development Settings
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug

# Performance (Development)
DATA_CLIENT_TIMEOUT=30000
DATA_CACHE_DEFAULT_TTL=60000
SECURITY_RATE_LIMIT_ENABLED=false
```

### Production Template (.env.production)
```bash
# Production configuration template

# Clerk Authentication (Required - Use production keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_publishable_key
CLERK_SECRET_KEY=sk_live_your_production_secret_key

# Data Infrastructure (Required)
DATA_LAMBDA_ENDPOINT=https://api.your-domain.com
DATA_API_KEY=your_secure_production_api_key

# Production Settings
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json

# Performance (Optimized)
DATA_CLIENT_TIMEOUT=30000
DATA_CLIENT_MAX_RETRIES=3
DATA_CLIENT_MAX_CONNECTIONS=100
DATA_CACHE_DEFAULT_TTL=300000
DATA_CACHE_MAX_SIZE=2000

# Security (Strict)
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_RATE_LIMIT_READ_RPM=1000
SECURITY_RATE_LIMIT_WRITE_RPM=500
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365

# Monitoring (Comprehensive)
PERFORMANCE_MONITORING_ENABLED=true
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=ops@your-domain.com
```

This configuration documentation provides comprehensive guidance for deploying and operating the Tree Chat data infrastructure across different environments with appropriate security, performance, and monitoring settings.