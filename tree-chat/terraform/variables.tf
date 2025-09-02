variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-northeast-1" # Tokyo region
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "tree-chat"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small" # 2 vCPU, 2 GB RAM - good for small apps
}

variable "volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 20
}

variable "public_key_path" {
  description = "Path to public key for SSH access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "ssh_allowed_ips" {
  description = "List of IPs allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Change this to your IP for security
}

# Application environment variables
variable "anthropic_api_key" {
  description = "Anthropic API key for LLM"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "tavily_api_key" {
  description = "Tavily API key for web search"
  type        = string
  sensitive   = true
  default     = ""
}

variable "langsmith_api_key" {
  description = "LangSmith API key for monitoring"
  type        = string
  sensitive   = true
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
}