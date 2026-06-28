locals {
  secrets = [
    "stripe-secret-key",
    "stripe-webhook-secret",
    "stripe-connect-client-id",
    "firebase-service-account-json",
    "algolia-app-id",
    "algolia-api-key",
    "db-password",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secrets)
  secret_id = each.value
  depends_on = [google_project_service.apis]

  replication {
    auto {}
  }
}

# Grant Cloud Run SA access to secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each  = toset(local.secrets)
  secret_id = google_secret_manager_secret.secrets[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run.email}"
}
