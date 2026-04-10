.PHONY: dev-frontend dev-backend build-frontend build run db

# Development
dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && pnpm dev

# Production
build-frontend:
	cd frontend && pnpm build

build: build-frontend
	@echo "Frontend built to backend/static"

run:
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Database (via Docker)
db:
	docker compose up -d db
