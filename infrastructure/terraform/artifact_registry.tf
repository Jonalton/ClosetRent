resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "closetrent"
  description   = "ClosetRent Docker images"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}
