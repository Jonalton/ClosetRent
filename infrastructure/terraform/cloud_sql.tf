resource "google_sql_database_instance" "postgres" {
  name             = "closetrent-db"
  database_version = "POSTGRES_15"
  region           = var.region
  depends_on       = [google_project_service.apis]

  settings {
    tier              = "db-g1-small"
    availability_type = "REGIONAL"
    disk_size         = 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }

    maintenance_window {
      day          = 7
      hour         = 4
      update_track = "stable"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "db" {
  name     = "closetrent"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "db_user" {
  name     = "closetrent"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
