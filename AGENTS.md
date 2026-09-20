# AGENTS.md — MealHQ frontends (`Zorvia`)

Public Next.js monorepo for **MealHQ** UIs. Infra IDs may still use `zorvia-*`.

**Backend:** private sibling [`mealhq-api`](https://github.com/rvchauhan99/mealhq-api). Do not add a `backend/` folder here.

Open both repos via [`MealHQ.code-workspace`](../MealHQ.code-workspace). Cross-repo map: sibling `mealhq-api/docs/WORKSPACE.md`.

When this file and docs disagree, **docs win**. On product/API behavior, **mealhq-api docs win**.

## Layout

- `frontend/` — provider + consumer (TypeScript App Router)
- `admin-frontend/` — platform admin (`/api/platform/*`)
- `docs/` — FE-safe docs · `design_guidelines.json` — UI constitution

## Read order

1. [docs/INDEX.md](docs/INDEX.md)
2. [design_guidelines.json](design_guidelines.json) for visual work
3. Sibling `mealhq-api/docs/INDEX.md` for API contracts / deploy / billing engines

## Non-negotiables

- No Vercel deploy / git commit / PR unless the user explicitly asks
- Preserve `data-testid`; prefer TypeScript in `frontend/`
- Never commit secrets
- Local ops only (client seeds, import CSVs, kitchen handbooks, one-off QA): **`.gitignore` + `.dockerignore` same change** — see `.cursor/rules/no-local-ops-to-github.mdc`
- Do not invent Phase 2 (notification inbox UI, WhatsApp chat inbox)
- Billing UI: gate flat billing on both `monthly_flat` and `cycle_flat` (see docs/FUNCTIONAL.md)
- Production API: **`https://api2.mealhq.ca`** (set on Vercel by operator)

## Mandatory testing gate

Before Done: [docs/TESTING.md](docs/TESTING.md) + `.cursor/skills/mealhq-ui-screen/SKILL.md` (build + browser).

## Local

```bash
npm run dev:frontend   # :3000
npm run dev:admin      # :3001
```

## When you change behavior

Update FE docs here. If API behavior changes, update **mealhq-api** docs in the same change set.
