terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "closetrent-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "redis.googleapis.com",
    "vpcaccess.googleapis.com",
    "servicenetworking.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# VPC for private services
resource "google_compute_network" "vpc" {
  name                    = "closetrent-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "closetrent-subnet"
  ip_cidr_range = "10.0.0.0/24"
  network       = google_compute_network.vpc.id
  region        = var.region
}

# VPC Connector for Cloud Run → Cloud SQL/Redis
resource "google_vpc_access_connector" "connector" {
  name          = "closetrent-vpc-connector"
  region        = var.region
  subnet {
    name = google_compute_subnetwork.subnet.name
  }
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
  depends_on    = [google_project_service.apis]
}
