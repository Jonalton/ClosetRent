# ClosetRent

Peer-to-peer fashion rental marketplace — Airbnb for wardrobes. Built with FastAPI, React 18, Cloud Run, and Stripe Connect.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async, Alembic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query |
| Database | Cloud SQL PostgreSQL 15 |
| Storage | Google Cloud Storage |
| Auth | Firebase Authentication |
| Payments | Stripe Connect |
| Cache | Cloud Memorystore (Redis 7) |
| Search | Algolia |
| Deploy | Cloud Run, Firebase Hosting, Terraform, GitHub Actions |

## Local Development

### Prerequisites
- Docker Desktop
- Python 3.12
- Node 20
- `gcloud` CLI (for GCS signed URLs in production)

### 1. Clone and configure environment

```bash
git clone https://github.com/your-org/closetrent.git
cd closetrent
cp .env.example backend/.env
# Edit backend/.env with your credentials
```

### 2. Start local services

```bash
make dev
```

This starts Postgres and Redis via Docker Compose, then runs the FastAPI backend on port 8000 and Vite dev server on port 5173.

### 3. Run database migrations

```bash
make migrate
```

### 4. Backend only

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Frontend only

```bash
cd frontend
npm install
npm run dev
```

API docs are available at http://localhost:8000/docs in development.

## Testing

```bash
make test
# or
cd backend && pytest tests/ -v --cov=app --cov-report=html
```

## Linting

```bash
make lint
```

## Key Business Rules

### Pricing
- Platform fee: **15%** of total rental price
- Owner receives: **85%** via Stripe Connect transfer on completion
- Deposit is held as a manual PaymentIntent; refunded on clean return

### Rental State Machine

```
pending → confirmed | cancelled
confirmed → shipped | cancelled
shipped → active
active → returned
returned → completed | disputed
disputed → completed | cancelled
```

### Image Upload Flow
1. Frontend requests a signed URL: `POST /api/storage/signed-url`
2. Backend generates a 15-minute GCS signed URL
3. Frontend uploads directly to GCS via `PUT`
4. Frontend sends the public GCS URL when creating/updating the listing

## Infrastructure

All infrastructure is managed with Terraform in `infrastructure/terraform/`.

```bash
cd infrastructure/terraform
terraform init
terraform plan -var="project_id=your-project" -var="db_password=secret"
terraform apply
```

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | GCP project ID |
| `WIF_PROVIDER` | Workload Identity Federation provider |
| `WIF_SERVICE_ACCOUNT` | GitHub Actions service account email |
| `VITE_API_URL` | Backend Cloud Run URL |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON for hosting deploys |

## Project Structure

```
closetrent/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── main.py           # App factory, routes
│   │   ├── config.py         # Pydantic settings
│   │   ├── database.py       # Async SQLAlchemy engine
│   │   ├── dependencies.py   # Firebase JWT auth
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # FastAPI route handlers
│   │   ├── services/         # GCS, Stripe, Firebase, Algolia clients
│   │   └── middleware/       # CORS, structured logging
│   ├── migrations/           # Alembic migrations
│   └── tests/                # pytest test suite
├── frontend/          # React + TypeScript SPA
│   └── src/
│       ├── api/              # Axios API client
│       ├── pages/            # Route pages
│       ├── components/       # Shared UI components
│       └── context/          # AuthContext
├── infrastructure/
│   ├── terraform/            # All GCP resources
│   └── docker-compose.yml    # Local dev services
└── .github/workflows/        # CI/CD pipelines
```

## License

MIT
