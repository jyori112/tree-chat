#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Tree Chat Deployment Script${NC}"
echo "================================"

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

echo "Checking prerequisites..."
check_command terraform
check_command aws
check_command ssh-keygen

# Get deployment environment
echo -e "\n${YELLOW}Select deployment environment:${NC}"
echo "1) Development (t3.micro - Free tier eligible)"
echo "2) Production (t3.small - Recommended)"
echo "3) Custom"
read -p "Enter choice [1-3]: " ENV_CHOICE

case $ENV_CHOICE in
    1)
        INSTANCE_TYPE="t3.micro"
        echo -e "${GREEN}✓ Using t3.micro (1 vCPU, 1GB RAM)${NC}"
        ;;
    2)
        INSTANCE_TYPE="t3.small"
        echo -e "${GREEN}✓ Using t3.small (2 vCPU, 2GB RAM)${NC}"
        ;;
    3)
        read -p "Enter instance type: " INSTANCE_TYPE
        echo -e "${GREEN}✓ Using $INSTANCE_TYPE${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Setup SSH key if needed
SSH_KEY_PATH="$HOME/.ssh/tree-chat-key"
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "\n${YELLOW}Generating SSH key...${NC}"
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "tree-chat-deployment"
    echo -e "${GREEN}✓ SSH key generated at $SSH_KEY_PATH${NC}"
else
    echo -e "${GREEN}✓ Using existing SSH key at $SSH_KEY_PATH${NC}"
fi

# Setup Terraform variables
cd terraform

if [ ! -f terraform.tfvars ]; then
    echo -e "\n${YELLOW}Setting up Terraform variables...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    
    # Get current IP for SSH access
    CURRENT_IP=$(curl -s https://api.ipify.org)
    sed -i.bak "s|YOUR_IP_ADDRESS|$CURRENT_IP|" terraform.tfvars
    
    echo -e "${YELLOW}Please edit terraform.tfvars and add your API keys:${NC}"
    echo "  - anthropic_api_key (required)"
    echo "  - openai_api_key (optional)"
    echo "  - Other API keys as needed"
    echo ""
    read -p "Press enter after editing terraform.tfvars..."
fi

# Update instance type in tfvars
sed -i.bak "s|instance_type = \".*\"|instance_type = \"$INSTANCE_TYPE\"|" terraform.tfvars
sed -i.bak "s|public_key_path = \".*\"|public_key_path = \"$SSH_KEY_PATH.pub\"|" terraform.tfvars

# Initialize Terraform
echo -e "\n${YELLOW}Initializing Terraform...${NC}"
terraform init

# Plan deployment
echo -e "\n${YELLOW}Planning infrastructure...${NC}"
terraform plan -out=tfplan

# Confirm deployment
echo -e "\n${YELLOW}Ready to deploy. This will create:${NC}"
echo "  - 1 VPC with public subnet"
echo "  - 1 EC2 instance ($INSTANCE_TYPE)"
echo "  - 1 Elastic IP"
echo "  - Security groups and networking"
echo ""
read -p "Do you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

# Apply Terraform
echo -e "\n${YELLOW}Creating infrastructure...${NC}"
terraform apply tfplan

# Get outputs
PUBLIC_IP=$(terraform output -raw instance_public_ip)
SSH_COMMAND="ssh -i $SSH_KEY_PATH ubuntu@$PUBLIC_IP"

echo -e "\n${GREEN}✅ Infrastructure created successfully!${NC}"
echo "================================"
echo -e "${GREEN}Instance IP: $PUBLIC_IP${NC}"
echo -e "${GREEN}SSH Command: $SSH_COMMAND${NC}"
echo ""

# Wait for instance to be ready
echo -e "${YELLOW}Waiting for instance to be ready...${NC}"
sleep 30

# Deploy application
echo -e "\n${YELLOW}Deploying application...${NC}"

# Create .env file
cat > ../.env.production <<EOF
ANTHROPIC_API_KEY=$(grep anthropic_api_key terraform.tfvars | cut -d'"' -f2)
OPENAI_API_KEY=$(grep openai_api_key terraform.tfvars | cut -d'"' -f2)
TAVILY_API_KEY=$(grep tavily_api_key terraform.tfvars | cut -d'"' -f2)
LANGSMITH_API_KEY=$(grep langsmith_api_key terraform.tfvars | cut -d'"' -f2)
EOF

# Copy application files to server
echo "Copying application files..."
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -r \
    ../docker-compose.yml \
    ../.env.production \
    ../apps \
    ../package.json \
    ../pnpm-lock.yaml \
    ../pnpm-workspace.yaml \
    ../turbo.json \
    ubuntu@$PUBLIC_IP:/home/ubuntu/app/

# Build and start application
echo "Building and starting application..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'ENDSSH'
    cd /home/ubuntu/app
    mv .env.production .env
    
    # Build Docker images
    docker-compose build
    
    # Start services
    docker-compose up -d
    
    # Check status
    docker-compose ps
ENDSSH

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo "================================"
echo -e "${GREEN}Application URLs:${NC}"
echo "  - Frontend: http://$PUBLIC_IP"
echo "  - Backend: http://$PUBLIC_IP:2024"
echo ""
echo -e "${GREEN}Management Commands:${NC}"
echo "  - SSH: $SSH_COMMAND"
echo "  - Logs: ssh -i $SSH_KEY_PATH ubuntu@$PUBLIC_IP 'cd /home/ubuntu/app && docker-compose logs -f'"
echo "  - Restart: ssh -i $SSH_KEY_PATH ubuntu@$PUBLIC_IP 'cd /home/ubuntu/app && docker-compose restart'"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Configure domain name (optional)"
echo "  2. Setup SSL certificate with Let's Encrypt"
echo "  3. Configure monitoring and backups"