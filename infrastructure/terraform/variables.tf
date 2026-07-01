variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "northamerica-northeast2"
}

variable "db_password" {
  description = "Cloud SQL database password"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "cors_origins" {
  description = "Comma-separated allowed CORS origins (e.g. your Firebase Hosting URL)"
  type        = string
}
