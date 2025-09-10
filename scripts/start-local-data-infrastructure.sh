#!/bin/bash

# Tree Chat - Start Local Data Infrastructure
# This script starts the complete local development environment for data infrastructure

set -e

echo "🚀 Starting Tree Chat Data Infrastructure (Local Development)"
echo "=============================================================="

# Check dependencies
echo "📋 Checking dependencies..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI is required but not installed."
    echo "   Please install SAM CLI: brew install aws-sam-cli"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo "❌ Java is required for DynamoDB Local but not installed."
    echo "   Please install Java: brew install openjdk"
    exit 1
fi

echo "✅ All dependencies are available"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Check required ports
echo "📡 Checking ports..."
PORTS_NEEDED=(3001 3002 8000 8001 2024)
PORTS_IN_USE=()

for port in "${PORTS_NEEDED[@]}"; do
    if ! check_port $port; then
        PORTS_IN_USE+=($port)
    fi
done

if [ ${#PORTS_IN_USE[@]} -ne 0 ]; then
    echo "❌ The following ports are in use: ${PORTS_IN_USE[*]}"
    echo "   Please free these ports or stop conflicting services:"
    echo "   - Port 3001: Lambda API Gateway (SAM Local)"
    echo "   - Port 3002: Next.js Web App"
    echo "   - Port 8000: DynamoDB Local"
    echo "   - Port 8001: DynamoDB Admin UI"
    echo "   - Port 2024: LangGraph Agents"
    exit 1
fi

echo "✅ All required ports are available"

# Start DynamoDB Local and Admin UI
echo "🗄️  Starting DynamoDB Local..."
docker-compose -f docker-compose.local.yml up -d

# Wait for DynamoDB to be ready
echo "⏳ Waiting for DynamoDB Local to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000 >/dev/null 2>&1; then
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ DynamoDB Local failed to start after 30 seconds"
        exit 1
    fi
done
echo "✅ DynamoDB Local is ready on port 8000"

# Create DynamoDB table
echo "📝 Creating DynamoDB table..."
aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --region us-east-1 \
    --table-name tree-chat-data-local \
    --attribute-definitions \
        AttributeName=workspaceId,AttributeType=S \
        AttributeName=path,AttributeType=S \
    --key-schema \
        AttributeName=workspaceId,KeyType=HASH \
        AttributeName=path,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --no-cli-pager \
    2>/dev/null || echo "⚠️  Table might already exist"

echo "✅ DynamoDB table is ready"

# Build shared package
echo "🔨 Building shared package..."
cd packages/shared
pnpm build
cd ../..

# Install Lambda dependencies
echo "📦 Installing Lambda dependencies..."
cd infrastructure/lambda
pnpm install
cd ../..

# Start SAM Local API
echo "🚀 Starting SAM Local API Gateway..."
echo "   Lambda functions will be available at: http://localhost:3001"
echo "   DynamoDB Admin UI available at: http://localhost:8001"

# Set environment variables for local development
export DYNAMODB_ENDPOINT="http://localhost:8000"
export DYNAMODB_TABLE_NAME="tree-chat-data-local"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="local"
export AWS_SECRET_ACCESS_KEY="local"
export NODE_ENV="development"

# Start SAM Local
sam local start-api --port 3001 --host 0.0.0.0 --env-vars local-env.json

echo "🎉 Tree Chat Data Infrastructure is now running!"
echo ""
echo "Available Services:"
echo "  - Lambda API Gateway: http://localhost:3001"
echo "  - DynamoDB Local: http://localhost:8000"
echo "  - DynamoDB Admin UI: http://localhost:8001"
echo "  - Next.js Web App: http://localhost:3002 (start with 'pnpm dev')"
echo ""
echo "To stop the infrastructure:"
echo "  - Press Ctrl+C to stop SAM Local"
echo "  - Run: docker-compose -f docker-compose.local.yml down"