# Documentation index — MealHQ frontends (Zorvia)

**Last updated:** 2026-09-21  
**Status:** FE-safe map. Product/API truth lives in sibling **mealhq-api**. When FE and API docs disagree on behavior, **mealhq-api wins**.

| # | Doc | What it decides |
|---|-----|-----------------|
| 0 | Sibling [WORKSPACE.md](../../mealhq-api/docs/WORKSPACE.md) | Multi-root workspace, ports, cross-repo Done |
| 1 | [DEVELOPMENT.md](./DEVELOPMENT.md) | Local FE/admin run, BACKEND_URL |
| 2 | [TESTING.md](./TESTING.md) | Build + browser gates |
| 3 | [FUNCTIONAL.md](./FUNCTIONAL.md) | FE journeys + UI billing gates (summary; API SoT for product) |
| 4 | [SEO.md](./SEO.md) | SEO / domains / GA |
| 5 | [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) | Vercel root dirs + env |
| 6 | [DAY_CYCLE_ONBOARDING.md](./DAY_CYCLE_ONBOARDING.md) | Kitchen-facing day-cycle setup |
| 7 | [CONSUMER_ACCOUNT.md](./CONSUMER_ACCOUNT.md) | Consumer signup guide |
| 8 | [../design_guidelines.json](../design_guidelines.json) | UI visual constitution |

API deep docs (open sibling clone): `mealhq-api/docs/INDEX.md` → FUNCTIONAL, TECHNICAL, DEPLOY_VULTR, **ROUTE_PLANNING** (full routing specification), etc.

## Non-negotiables (FE)

1. No Vercel deploy / git commit / PR unless the user explicitly asks
2. Preserve `data-testid`
3. Do not invent Phase 2 inbox / WhatsApp chat UI
4. Flat billing UI: gate on `monthly_flat` **and** `cycle_flat`
5. Never commit secrets; no `backend/` folder in this repo
6. Production API target: **`https://api2.mealhq.ca`** (operator sets Vercel env)
