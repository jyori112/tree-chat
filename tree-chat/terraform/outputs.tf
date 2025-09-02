output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.app.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ${var.public_key_path} ubuntu@${aws_eip.app.public_ip}"
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${aws_eip.app.public_ip}"
}

output "nextjs_url" {
  description = "Next.js application URL"
  value       = "http://${aws_eip.app.public_ip}:3000"
}

output "langgraph_url" {
  description = "LangGraph API URL"
  value       = "http://${aws_eip.app.public_ip}:2024"
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.app.id
}