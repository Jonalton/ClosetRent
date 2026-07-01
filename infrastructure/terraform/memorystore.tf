resource "google_redis_instance" "cache" {
  name               = "closetrent-redis"
  tier               = "BASIC_HA"
  memory_size_gb     = 1
  region             = var.region
  authorized_network = google_compute_network.vpc.id
  redis_version      = "REDIS_7_0"
  display_name       = "ClosetRent Cache"
  depends_on         = [google_project_service.apis]

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 4
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }
}
