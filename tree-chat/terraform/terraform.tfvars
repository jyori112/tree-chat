# AWS Configuration
aws_region = "ap-northeast-1"  # Tokyo region

# Project Configuration
project_name  = "tree-chat"
instance_type = "t3.small"  # 2 vCPU, 2GB RAM
volume_size   = 20

# SSH Configuration
public_key_path = "~/.ssh/tree-chat-key.pub"
ssh_allowed_ips = ["106.73.56.128/32"]  # Current IP address

# API Keys (Required - will need to be filled in)
anthropic_api_key = ""
openai_api_key    = "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"
tavily_api_key    = "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"
langsmith_api_key = "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"

# Domain Configuration (optional)
domain_name = ""