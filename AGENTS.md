# AGENTS.md — MealHQ frontends (`Zorvia`)

Public Next.js monorepo for **MealHQ** UIs. Infra IDs may still use `zorvia-*`.

**Workspace root:** `/Users/ravatrajsinhchauhan/Documents/Programs/MINE/Zorvia-main`  
**Sibling API:** `/Users/ravatrajsinhchauhan/Documents/Programs/MINE/mealhq-api`  
**Open both:** [`MealHQ.code-workspace`](../MealHQ.code-workspace) under `MINE/`.  
**PMB / graph project key:** `mealhq-api` (note `Zorvia-main` when FE-only)

**Backend:** private sibling `mealhq-api`. Do not add a `backend/` folder here.

When this file and docs disagree, **docs win**. On product/API behavior, **mealhq-api docs win**.

**Last synced:** 2026-11-06 — workspace pack (ai-context, FE Stack/Local/Delivery rules, ui-screen refresh).

## Layout

- `frontend/` — provider + consumer (TypeScript App Router) — `:3000`
- `admin-frontend/` — platform admin (`/api/platform/*`) — `:3001`
- `docs/` — FE-safe docs · `design_guidelines.json` — UI constitution
- `ai-context/` — short agent pack (detail in docs + API)

## Mandatory skills

1. `.cursor/skills/mealhq-ui-screen/SKILL.md` before marking UI work complete
2. Sibling API `.cursor/skills/mealhq-context-sync/SKILL.md` after behavior-changing work
3. For API contract / journey changes: also follow sibling `mealhq-delivery-qa` + `mealhq-testing`

Global always-on Cursor rules (`development-loop`, Browser MCP UI gate, build-after-UI) still apply.

## Local

| Service | URL |
|---------|-----|
| Provider + consumer | `http://localhost:3000` |
| Platform admin | `http://localhost:3001` |
| API (sibling) | `http://127.0.0.1:8000` |

```bash
npm run dev:frontend   # :3000
npm run dev:admin      # :3001
```

FE rewrites `/api` → `BACKEND_URL` or `http://127.0.0.1:8000`. Production API: `https://api2.mealhq.ca`.

## Read-next (do not full-scan the repo)

| Task | Open |
|------|------|
| FE layout / rewrite | `ai-context/architecture.md` |
| Hard UI rules | `ai-context/rules.md` |
| FE doc map | `docs/INDEX.md` |
| Visual system | `design_guidelines.json` |
| Product / API truth | Sibling `mealhq-api/ai-context/` then `mealhq-api/docs/` |
| Finish / QA | `.cursor/skills/mealhq-ui-screen/SKILL.md` + `docs/TESTING.md` |

## Hard stops

- No Vercel deploy / git commit / PR unless the user explicitly asks
- Preserve `data-testid`; prefer TypeScript in `frontend/`
- Never commit secrets; no `backend/` folder in this repo
- Do not invent Phase 2 (notification inbox UI, WhatsApp chat inbox)
- Billing UI: gate flat billing on both `monthly_flat` and `cycle_flat`
- Client seeds / kitchen handbooks / one-off QA → **`.gitignore` + `.dockerignore` same change**
- Do not open/index empty stub `Documents/Programs/mealhq-api`

## Stale if

- Ports or rewrite target change without updating this file + Local rule
- New app surface not reflected in `ai-context/architecture.md`
- User asks for full context resync

## When you change behavior

Update FE docs here. If API behavior changes, update **mealhq-api** docs in the same change set.
