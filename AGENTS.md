# AGENTS.md — MealHQ frontends (`Zorvia`)

Public Next.js monorepo for **MealHQ** UIs. Brand: **MealHQ**. Infra IDs may still use `zorvia-*`.

**Backend is a separate private repo:** [`rvchauhan99/mealhq-api`](https://github.com/rvchauhan99/mealhq-api). Do not assume a local `backend/` folder in this repo.

## Layout

- `frontend/` — provider + consumer App Router (TypeScript)
- `admin-frontend/` — platform admin (`/api/platform/*`)
- `docs/` — FE-safe product/SEO docs
- `design_guidelines.json` — UI rules when editing visuals

## Read order

1. [`docs/FUNCTIONAL.md`](docs/FUNCTIONAL.md)
2. [`docs/SEO.md`](docs/SEO.md)
3. [`design_guidelines.json`](design_guidelines.json)
4. API contracts / Cloud Run / env for the server: see **mealhq-api** docs (`TECHNICAL.md`, `DEPLOY_CLOUD_RUN.md`, `PLATFORM_BLUEPRINT.md`)

## Non-negotiables

- Do **not** deploy to production (Vercel) or create git commits / PRs unless the user explicitly asks.
- Preserve existing `data-testid` attributes.
- Prefer TypeScript in `frontend/`.
- Never commit secrets (`.env`, Firebase private keys).
- Do not invent Phase 2 features (notification inbox UI, WhatsApp chat inbox) unless asked. WhatsApp product UI is gated by backend `WHATSAPP_FEATURES_ENABLED`.
- Admin UI calls the same Cloud Run API under `/api/platform/*`.

## Local dev

```bash
npm run dev:frontend   # :3000 — rewrites /api → BACKEND_URL or http://127.0.0.1:8000
npm run dev:admin      # :3001
```

Run the API from a sibling clone of `mealhq-api`.

## When you change behavior

Update FE docs here; if API behavior changes, update docs in **mealhq-api** in the same change set.
