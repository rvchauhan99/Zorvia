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

Screen: `/provider/route-planning` — **full-bleed Routes workspace** (Leaflet map + side rail). Visual system: [Figma — MealHQ Route planning workspace](https://www.figma.com/design/hPOhVI0bcgtWUSaxnbz14a) (not legacy `design_guidelines.json`).

- Top bar: meal slot · date · city (**filter only**) · **Export CSV** (all pools) · Optimize · Open in Maps  
- Left rail (only scroll): Unassigned first → driver pools; compact stop rows with name + **phone** (`wa.me`); pool header shows **Start: Kitchen** / **Start: {customer}**; pool **View** → `/provider/route-planning/driver/{id}` (map + km/min from pool start + stop list + CSV/**Print**)  
- Driver **Print**: downloads route PDF + opens **driver** WhatsApp (Settings → Team phone) to attach the PDF; customer phones in the PDF/list open **customer** chat  
- **Deliveries** (`/provider/deliveries`, admin + driver): customer phone on each stop / next card → `wa.me`  
- **Kitchen** pack list + Print PDF: name, phone (`wa.me` in UI), CRM notes  
- Settings → Team: optional staff **phone** (create + blur-save on drivers) for Print→driver WhatsApp; **Remove** soft-deletes staff — drivers pick Unassigned / transfer to existing / create new driver & transfer before removal
- Map: OSRM road polylines via `POST /route-planning/route-geometry` (distance/duration when available; straight-leg fallback); origin = each pool’s effective start  
- Selection dock: Assign / **To Unassigned** / By sequence (empty SearchableSelect shows “Unassigned pool”)  
- **Assign by sequence** sheet: defaults source to the largest non-empty pool; range rows are stacked cards (From/To + full-width driver) so the picker is not clipped  
- **Set as start**: stop ⋯ → StartSheet (**Set pool start**) without selecting a city → Temporary / Default → quiet Optimize **that pool only**  
- **Optimize sheet** (Figma): scope = This city / All cities / Unassigned pool / **Full rebalance (auto-assign)** / Selected drivers; every run requires a confirm step; Full rebalance needs an ack checkbox; tours use **per-pool starts** (kitchen by default); Full rebalance unassigns all → kitchen day-build → even-split → per-driver reopt from each pool start  
- **Best fit**: Unassigned ⋯ **Best fit** (one stop) or header **Best fit all** → confirm → `POST /route-planning/auto-place` (cheapest driver gap vs pool start, sequential)  
- Day-build: Unassign all → Optimize Unassigned → Bulk ranges → Optimize drivers **or** one-click **Full rebalance**  
- API/routing contract: mealhq-api `docs/ROUTE_PLANNING.md`

New-customer **Route** step (`/provider/customers/new`): after a confirmed address, shows up to **3 suggested driver+stop** cards from `POST /route-planning/suggest-placements` (cheapest haversine insert). Tapping a card fills Assigned driver + sequence; manual SearchableSelect remains the override. Assignments stay manual — suggestions are assistive only.

## 6. Related FE docs

- [CONSUMER_ACCOUNT.md](./CONSUMER_ACCOUNT.md)
- [SEO.md](./SEO.md)
- [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)
- [INDEX.md](./INDEX.md)
