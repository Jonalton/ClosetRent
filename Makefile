.PHONY: dev test lint migrate deploy

dev:
	docker compose -f infrastructure/docker-compose.yml up -d
	cd backend && uvicorn app.main:app --reload --port 8000 &
	cd frontend && npm run dev

test:
	cd backend && pytest tests/ -v --cov=app

lint:
	cd backend && ruff check app/ && black --check app/
	cd frontend && npm run lint && npx tsc --noEmit

migrate:
	cd backend && alembic upgrade head

migrate-create:
	cd backend && alembic revision --autogenerate -m "$(name)"

deploy:
	gcloud run deploy closetrent-backend \
		--image northamerica-northeast2-docker.pkg.dev/$(closetrent)/closetrent/backend:latest \
		--region northamerica-northeast2 \
		--project $(closetrent)
