resource "google_service_account" "cloud_run" {
  account_id   = "closetrent-cloud-run"
  display_name = "ClosetRent Cloud Run Service Account"
}

resource "google_project_iam_member" "cloud_run_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# GitHub Actions service account
resource "google_service_account" "github_actions" {
  account_id   = "closetrent-github-actions"
  display_name = "ClosetRent GitHub Actions"
}

resource "google_project_iam_member" "github_actions_roles" {
  for_each = toset([
    "roles/run.developer",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}
