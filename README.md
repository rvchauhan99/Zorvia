# MealHQ (Zorvia) — Frontend

Public Next.js apps for **MealHQ**:

- [`frontend/`](frontend/) — provider + consumer (Vercel)
- [`admin-frontend/`](admin-frontend/) — platform admin

Backend (private): [`rvchauhan99/mealhq-api`](https://github.com/rvchauhan99/mealhq-api) — prod **`https://api2.mealhq.ca`**.

Multi-root workspace: [`MealHQ.code-workspace`](../MealHQ.code-workspace).

## Quick start

```bash
cp frontend/.env.example frontend/.env
# NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000  (or https://api2.mealhq.ca)
npm run install:frontend
npm run dev:frontend

npm run install:admin
npm run dev:admin
```

Ports: frontend `3000` · admin `3001` · API `8000` (sibling mealhq-api).

## Vercel

- Root Directory **`frontend`** / **`admin-frontend`**
- Set `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` → **`https://api2.mealhq.ca`**
- Details: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)

## Docs

Start at **[docs/INDEX.md](docs/INDEX.md)**. Agent: [AGENTS.md](AGENTS.md). Design: [design_guidelines.json](design_guidelines.json).
