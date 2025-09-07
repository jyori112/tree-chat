# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy app package files
COPY apps/agents/package.json ./apps/agents/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and langgraph config
COPY apps/agents ./apps/agents
COPY langgraph.json ./

# Build the application
RUN pnpm --filter agents build

# Production stage
FROM node:20-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S langgraph -u 1001

# Copy package files
COPY --from=builder --chown=langgraph:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=langgraph:nodejs /app/apps/agents/package.json ./apps/agents/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application and langgraph config from root
COPY --from=builder --chown=langgraph:nodejs /app/apps/agents/dist ./apps/agents/dist
COPY --from=builder --chown=langgraph:nodejs /app/apps/agents/src ./apps/agents/src
COPY --from=builder --chown=langgraph:nodejs /app/langgraph.json ./

USER langgraph

EXPOSE 2024

ENV PORT 2024
ENV NODE_ENV production

CMD ["npx", "@langchain/langgraph-cli", "dev", "--port", "2024", "--host", "0.0.0.0", "--config", "langgraph.json"]