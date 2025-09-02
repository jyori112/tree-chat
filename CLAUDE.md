# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LangGraph-based agent chat application with a monorepo structure using Turborepo and pnpm. The project consists of a Next.js frontend (`apps/web`) and LangGraph agents backend (`apps/agents`).

## Development Commands

### Essential Commands
```bash
# Install dependencies (use pnpm)
pnpm install

# Start development servers (both web and agents)
pnpm dev

# Run linting
pnpm lint
pnpm lint:fix

# Build the project
pnpm build

# Format code
pnpm format
```

### Package-specific Commands
```bash
# Web app only (from apps/web)
pnpm dev         # Start Next.js dev server
pnpm build       # Build Next.js app
pnpm lint        # Run Next.js lint
pnpm lint:fix    # Fix linting issues

# Agents only (from apps/agents)
pnpm dev         # Start LangGraph server on port 2024
pnpm build       # Build TypeScript
pnpm lint        # Run ESLint
pnpm lint:fix    # Fix linting issues
```

## Architecture

### Monorepo Structure
- **Root**: Turborepo configuration with pnpm workspaces
- **apps/web**: Next.js 15 frontend with React 19
- **apps/agents**: LangGraph agents with multiple graph implementations

### LangGraph Agents (`apps/agents`)
The backend contains multiple agent implementations defined in `langgraph.json`:
- **react-agent** (`agent`): Basic ReAct pattern agent with tool calling
- **memory-agent** (`memory_agent`): Agent with memory capabilities
- **research-agent** (`research_agent`): Agent for research with retrieval
- **retrieval-agent** (`retrieval_agent`): Document retrieval and Q&A agent

Each agent follows the pattern:
- `graph.ts`: StateGraph definition with nodes and edges
- `configuration.ts`: Agent configuration and parameters
- `tools.ts`: Tool definitions (if applicable)
- `prompts.ts`: System prompts and templates
- `state.ts`: State type definitions using LangGraph Annotations

### Frontend Architecture (`apps/web`)
The Next.js app uses:
- **Providers Pattern**: `StreamProvider` and `ThreadProvider` manage LangGraph SDK connections
- **Agent Inbox UI**: Complex interrupt handling for human-in-the-loop interactions
- **Streaming**: Real-time message streaming using `@langchain/langgraph-sdk/react`
- **URL State Management**: Uses `nuqs` for query parameter state (apiUrl, assistantId, threadId)

Key components:
- `providers/Stream.tsx`: Manages LangGraph streaming connection and authentication
- `providers/Thread.tsx`: Handles thread management and history
- `components/thread/`: UI components for chat interface and message display
- `components/thread/agent-inbox/`: Human-in-the-loop interrupt handling

### State Management
- **Backend**: Uses LangGraph Annotations for type-safe state management
- **Frontend**: Combines React Context (Stream/Thread), URL state (nuqs), and local storage (API keys)

### API Integration
The app connects to LangGraph server (default: http://localhost:2024) and requires:
- **Local Development**: No API key needed
- **Deployed Graphs**: LangSmith API key required
- **Vector Stores**: Supports Elasticsearch, Pinecone, MongoDB based on agent configuration

## Environment Configuration

Required environment variables (see `.env.example`):
```
ANTHROPIC_API_KEY=       # For Anthropic models
OPENAI_API_KEY=          # For OpenAI models
TAVILY_API_KEY=          # For web search tools
ELASTICSEARCH_URL=       # For retrieval agents
PINECONE_API_KEY=        # For Pinecone vector store
MONGODB_URI=             # For MongoDB vector store
```

## ESLint Configuration

The project uses ESLint 9 with flat config:
- **agents**: TypeScript-specific rules with import plugin
- **web**: Next.js ESLint with React hooks and refresh plugins
- Known issue: Some Fast refresh warnings in Next.js layout files are expected

## Key Technical Decisions

1. **pnpm + Turborepo**: Efficient monorepo management with caching
2. **LangGraph SDK**: Official SDK for streaming and thread management
3. **Type-safe State**: LangGraph Annotations ensure type safety across agent states
4. **Human-in-the-Loop**: Agent Inbox pattern for interrupt handling
5. **URL State**: Query parameters for shareable chat sessions