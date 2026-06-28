resource "google_cloud_run_v2_service" "backend" {
  name     = "closetrent-backend"
  location = var.region
  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.connector,
  ]

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/closetrent/backend:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.listing_images.name
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql+asyncpg://closetrent:${var.db_password}@${google_sql_database_instance.postgres.private_ip_address}/closetrent"
      }
      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["stripe-secret-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["stripe-webhook-secret"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "FIREBASE_SERVICE_ACCOUNT_JSON"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["firebase-service-account-json"].secret_id
            version = "latest"
          }
        }
      }

      ports {
        container_port = 8000
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 5
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        timeout_seconds   = 5
        period_seconds    = 30
        failure_threshold = 3
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
