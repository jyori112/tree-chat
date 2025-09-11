# CI/CD Pipeline Setup for Tree Chat

This document provides comprehensive instructions for setting up the CI/CD pipeline for the Tree Chat application.

## Overview

The CI/CD pipeline automatically runs the following on pull requests and pushes to `main` and `develop` branches:

1. **Type checking** - TypeScript type validation
2. **Linting** - ESLint code quality checks
3. **Unit tests** - Jest unit test suite
4. **Build** - Project compilation
5. **E2E tests** - Playwright end-to-end tests with Clerk authentication

## Architecture

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 with React 19 (`apps/web`)
- **Shared packages**: `packages/data-client` and `packages/shared`
- **Testing**: Jest (unit) + Playwright (E2E)
- **Authentication**: Clerk
- **CI/CD**: GitHub Actions

## Required Environment Variables

### GitHub Repository Secrets

Set the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

#### Required for E2E Tests
```bash
TEST_EMAIL=your-test-account@example.com
TEST_PASSWORD=your-secure-test-password
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxx
```

#### Optional for Turborepo Remote Caching
```bash
TURBO_TOKEN=your-vercel-token
TURBO_TEAM=your-team-name  # Set as repository variable
```

### Local Development

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your local values in `.env.local`

## Test Command Reference

### Root Level Commands
```bash
# Run all linting across packages
pnpm lint

# Run all unit tests across packages
pnpm test

# Run type checking across packages
pnpm type-check

# Build all packages
pnpm build

# Run E2E tests (from root)
pnpm test:e2e

# Start development servers
pnpm dev
```

### Package-Specific Commands

#### Web App (`apps/web`)
```bash
cd apps/web

# Unit tests
pnpm test                 # Run Jest tests
pnpm test:watch          # Run Jest in watch mode
pnpm test:coverage       # Run with coverage report
pnpm test:integration    # Run integration tests only

# E2E tests
pnpm test:e2e            # Run Playwright tests
pnpm test:e2e:ui         # Run with UI mode
pnpm test:e2e:debug      # Run in debug mode

# Code quality
pnpm lint                # Next.js ESLint
pnpm lint:fix            # Auto-fix issues
pnpm type-check          # TypeScript check

# Build
pnpm build               # Next.js build
pnpm start               # Start production server
```

#### Shared Packages
```bash
cd packages/data-client
cd packages/shared

# Unit tests
pnpm test
pnpm test:watch
pnpm test:coverage

# Code quality
pnpm lint
pnpm lint:fix
pnpm type-check

# Build
pnpm build
```

## E2E Test Configuration

### Authentication Setup

The E2E tests use Clerk authentication with a dedicated test account:

1. **Test Account**: Use a dedicated email for testing (e.g., `yourname+test@gmail.com`)
2. **Environment Variables**: Set `TEST_EMAIL` and `TEST_PASSWORD` in CI/CD
3. **Clerk Keys**: Configure test environment Clerk keys
4. **Auth Flow**: Tests automatically log in before running test suites

### Test Structure

- **Location**: All E2E tests are in `apps/web/e2e/`
- **Setup**: `auth.setup.ts` handles authentication
- **State**: Authentication state saved to `apps/web/e2e/.auth/user.json`
- **Browsers**: Tests run on Chromium, Firefox, and WebKit

### File Organization

```
apps/web/e2e/
├── .auth/
│   └── user.json                 # Saved auth state
├── auth.setup.ts                 # Authentication setup
├── authentication.spec.ts        # Auth flow tests
├── error-handling.spec.ts        # Error scenarios
├── minimal-session-test.spec.ts  # Basic functionality
├── performance.spec.ts           # Performance tests
├── session-creation.spec.ts      # Session creation
├── session-management.spec.ts    # Session CRUD
├── session-management-from-tests.spec.ts  # Extended session tests
├── session-workspace.spec.ts     # Workspace functionality
└── workspace-isolation.spec.ts   # Multi-user isolation
```

## CI/CD Pipeline Details

### Workflow Triggers
- Pull requests to `main` or `develop`
- Direct pushes to `main` or `develop`

### Matrix Strategy
- **Node.js versions**: 18, 20
- **OS**: Ubuntu Latest
- **Timeout**: 30 minutes

### Pipeline Steps

1. **Checkout** - Get source code
2. **Setup** - Install pnpm, Node.js, dependencies
3. **Type Check** - `pnpm type-check`
4. **Lint** - `pnpm lint`
5. **Unit Tests** - `pnpm test`
6. **Build** - `pnpm build`
7. **Install Browsers** - Playwright browser setup
8. **E2E Tests** - `pnpm test:e2e`
9. **Upload Artifacts** - Test reports (on failure)

### Artifacts
- Playwright HTML reports (30-day retention)
- Test result screenshots/videos (30-day retention)

## Troubleshooting

### Common Issues

#### E2E Tests Failing
1. **Authentication Issues**
   - Verify `TEST_EMAIL` and `TEST_PASSWORD` are correct
   - Check Clerk keys are for test environment
   - Ensure test account exists in Clerk

2. **Timeout Issues**
   - Tests have 60-second timeout
   - Navigation timeout: 15 seconds
   - Action timeout: 10 seconds

3. **Port Conflicts**
   - Dev server runs on port 3002
   - Ensure port is available in CI

#### Build Failures
1. **TypeScript Errors**
   - Run `pnpm type-check` locally first
   - Fix type issues before pushing

2. **Lint Errors**
   - Run `pnpm lint:fix` to auto-fix issues
   - Address remaining issues manually

#### Turborepo Issues
1. **Cache Problems**
   - Clear cache: `pnpm exec turbo clean`
   - Rebuild: `pnpm build`

2. **Missing turbo.json**
   - File should exist at project root
   - Contains pipeline definitions

## Local Testing

### Run Full CI Pipeline Locally
```bash
# Install dependencies
pnpm install

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run unit tests
pnpm test

# Build project
pnpm build

# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
pnpm test:e2e
```

### Debug E2E Tests
```bash
cd apps/web

# Run specific test file
pnpm test:e2e authentication.spec.ts

# Run in UI mode
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug

# Run specific test
pnpm test:e2e --grep "should login successfully"
```

## Maintenance

### Regular Tasks
1. **Update dependencies** - Monthly security updates
2. **Review test coverage** - Ensure adequate coverage
3. **Monitor CI performance** - Optimize slow tests
4. **Update Node.js versions** - Keep matrix current

### Test Account Maintenance
1. **Rotate credentials** - Update test passwords regularly
2. **Clean test data** - Remove accumulated test data
3. **Monitor Clerk usage** - Stay within limits

## Security Considerations

1. **Secrets Management**
   - Never commit secrets to repository
   - Use GitHub secrets for sensitive data
   - Rotate credentials regularly

2. **Test Isolation**
   - Each test creates unique data
   - Tests clean up after themselves
   - No dependencies between tests

3. **Authentication**
   - Dedicated test account
   - Test environment Clerk keys
   - No production data access

## Performance Optimization

1. **Parallel Execution**
   - Tests run in parallel by default
   - Set to sequential in CI for stability

2. **Caching**
   - Turborepo cache optimization
   - Playwright browser caching
   - pnpm dependency caching

3. **Test Selection**
   - Use `--grep` for targeted testing
   - Organize tests by functionality
   - Skip slow tests in development

---

For questions or issues with the CI/CD pipeline, please create an issue in the repository or contact the development team.