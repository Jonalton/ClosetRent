resource "google_storage_bucket" "listing_images" {
  name                        = "closetrent-listing-images"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  versioning {
    enabled = true
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.listing_images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
