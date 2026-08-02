# MealHQ (Zorvia) — Frontend

Public Next.js apps for **MealHQ**:

- [`frontend/`](frontend/) — provider + consumer app (Vercel)
- [`admin-frontend/`](admin-frontend/) — platform admin UI

The FastAPI backend is **private**: [`rvchauhan99/mealhq-api`](https://github.com/rvchauhan99/mealhq-api) (Cloud Run `zorvia-api`).

## Quick start

```bash
# Frontend
cp frontend/.env.example frontend/.env
# Set NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000 (local API) or Cloud Run URL
npm run install:frontend
npm run dev:frontend

# Admin (optional)
cp admin-frontend/.env.example admin-frontend/.env  # if present
npm run install:admin
npm run dev:admin
```

Ports: frontend `3000` · admin `3001` · API `8000` (separate private repo).

## Vercel

- Root Directory: **`frontend`**
- Set `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` to the Cloud Run API URL
- Admin: separate Vercel project with Root Directory **`admin-frontend`** if deployed

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/FUNCTIONAL.md](docs/FUNCTIONAL.md) | Product / journeys |
| [docs/SEO.md](docs/SEO.md) | SEO / marketing domain |
| [design_guidelines.json](design_guidelines.json) | UI guidelines |
| [AGENTS.md](AGENTS.md) | Agent contract (frontend) |

API, deploy, and schema docs live in the private `mealhq-api` repo.
