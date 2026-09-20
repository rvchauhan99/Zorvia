# MealHQ frontends — Functional (FE-safe)

**Last updated:** 2026-09-20  
**Canonical product SoT:** sibling [`mealhq-api/docs/FUNCTIONAL.md`](../../mealhq-api/docs/FUNCTIONAL.md)  
**When this file and the API FUNCTIONAL disagree, the API file wins.**

This doc covers UI journeys, FE billing gates, and FE-only constraints. Deep billing engines, collections, and API contracts live in mealhq-api.

---

## 1. Surfaces

| App | Port | Audience |
|-----|------|----------|
| `frontend/` | 3000 | Provider kitchen + consumer portal |
| `admin-frontend/` | 3001 | Platform operators (`/api/platform/*`) |

Brand: **MealHQ**. Tenancy: one provider = one tenant (`tenant_id = provider_id`).

## 2. Personas (UI)

- **Provider admin / driver / viewer** — staff roles on provider users (see API FUNCTIONAL for mutate matrix)
- **Consumer** — deliveries, cancel cutoff, Interac payments, balance
- **Platform operator** — tenants, SaaS payments, reports in admin-frontend

## 3. Billing UI gates (non-negotiable)

Variants: `per_meal`, `monthly_adjustable`, `monthly_fixed`, `cycle_fixed`.

- Day-cycle uses `billing_mode = cycle_flat` and per-customer `cycle_anchor_date` (not day-of-month alone).
- Gate **flat-billing UI** on both `monthly_flat` and `cycle_flat` (not `monthly_flat` alone).
- Kitchen guides: [DAY_CYCLE_ONBOARDING.md](./DAY_CYCLE_ONBOARDING.md)

Detail: API `CYCLE_SUBSCRIPTION.md` / `MONTHLY_BILLING.md`.

## 4. FE constraints

- Preserve existing `data-testid` attributes
- Prefer TypeScript in `frontend/`
- Follow [design_guidelines.json](../design_guidelines.json)
- WhatsApp product UI gated by backend `WHATSAPP_FEATURES_ENABLED`
- Do **not** invent Phase 2: notification inbox UI, WhatsApp chat inbox

## 5. Route planning UI

Screen under provider route-planning. API/routing contract: mealhq-api `docs/ROUTE_PLANNING.md`. Prod API for hard-tests: `https://api2.mealhq.ca`.

## 6. Related FE docs

- [CONSUMER_ACCOUNT.md](./CONSUMER_ACCOUNT.md)
- [SEO.md](./SEO.md)
- [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)
- [INDEX.md](./INDEX.md)
