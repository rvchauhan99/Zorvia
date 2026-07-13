# AGENTS.md — Zorvia

You are working in the **Zorvia** monorepo (UI/API display name: **Tiffin OS** until a rename pass).

## Read order (do this before exploring the whole codebase)

1. [`docs/PLATFORM_BLUEPRINT.md`](docs/PLATFORM_BLUEPRINT.md) — requirements, flowcharts, decisions, known issues  
2. [`docs/FUNCTIONAL.md`](docs/FUNCTIONAL.md) — product behavior and journeys  
3. [`docs/TECHNICAL.md`](docs/TECHNICAL.md) — APIs, data model, env, runbook  
4. [`memory/INDEX.md`](memory/INDEX.md) — short memory map  
5. [`design_guidelines.json`](design_guidelines.json) — when touching UI

Do **not** re-derive platform architecture from scratch each session if these docs cover the question.

## Non-negotiables

- Tenancy: `tenant_id = provider_id`; always scope queries.
- Do not invent Phase 2 features (Stripe checkout, staff roles, notification inbox UI, invite API) unless the user asks.
- Subscription activate is **intentionally** without a payment gateway.
- Integrations must degrade gracefully (Resend stub, R2 → base64, Firebase → 501 / disabled buttons).
- Never commit secrets (`.env`, `backend/secrets/`, service account JSON).
- Preserve existing `data-testid` attributes.
- Prefer TypeScript only if the area already uses it; this frontend is JS/JSX.

## Stack reminders

- Backend: FastAPI in `backend/`, run with `npm run dev` (root) or `cd backend && npm run dev`
- Frontend: CRA+CRACO in `frontend/`, `npm run dev` (in `frontend/`) or `npm run dev:frontend` from root; restart after `REACT_APP_*` changes
- Tests: `python -m pytest tests/backend_test.py -n 0` from `backend/`
- Firebase project: `zorvia-app`

## When you change behavior

Update `docs/PLATFORM_BLUEPRINT.md` and the matching FUNCTIONAL or TECHNICAL section in the same PR/change set.
