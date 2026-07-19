# Zorvia — Functional Specification

**Product brand:** Zorvia  
**Last updated:** 2026-07-13  
**Source of truth:** live codebase; see also [PLATFORM_BLUEPRINT.md](./PLATFORM_BLUEPRINT.md) and [TECHNICAL.md](./TECHNICAL.md)

---

## 1. Problem and value

Zorvia is a multi-tenant SaaS for **Canadian tiffin providers**. Provider admins manage customers, daily deliveries, Interac e-Transfer payments, and reports. Consumers view upcoming deliveries, cancel today’s meal within cutoff rules, submit Interac payment references (optional screenshot), and see outstanding balance.

---

## 2. Personas

| Persona | Who | Primary goals |
|---------|-----|---------------|
| **Provider Admin** | Owner-operator of a tiffin kitchen | Onboard customers, run daily delivery list, verify Interac payments, export reports, manage org settings and SaaS subscription |
| **Provider Driver** | Delivery staff under a provider | Mark deliveries delivered/missed, reorder route, bulk mark — Deliveries module only |
| **Provider Viewer** | Read-only staff | View dashboard, customers, deliveries, payments, reports — no mutate, no settings/subscription |
| **Consumer** | Meal subscriber under one provider | See balance and deliveries, cancel before cutoff, submit payments |

There are **staff roles** on `platform_users`: `admin` (default), `driver` (deliveries mutate only), `viewer` (read-only operational modules).

---

## 3. Tenancy and access model

- One **provider** = one **tenant**.
- `tenant_id` on all scoped records equals `provider_id`.
- Provider users live in `platform_users` with role `admin` \| `driver` \| `viewer`.
- Consumers live in `consumer_accounts` linked to a `customers` row under that tenant.
- JWT claims: `sub` (user id), `ut` (`provider` \| `consumer`), `tid` (tenant id); staff role is loaded from `platform_users` on each request.
- Expired / inaccessible provider subscription:
  - Provider active routes → **402** → UI redirects admins to `/provider/subscription`
  - Consumer routes → **403** with message that provider subscription is inactive

### Staff access matrix

| Area | Admin | Viewer | Driver |
|------|-------|--------|--------|
| Dashboard | Full + quick mark + money KPIs | Ops KPIs only (no CAD); meal counts on route | Redirect → Deliveries |
| Customers | Full (price + outstanding; High balance filter) | Read; meal schedule qty only — no CAD; High balance filter hidden | Blocked (API + redirect) |
| Deliveries | Full; **meal count on every stop** (never price) | Read; meal count only | Full mark/reorder/bulk; meal count only |
| Payments | Full (amounts) | Read; status/ref without CAD amounts | Blocked |
| Analysis / Reports | Full money KPIs + CSV | Meal/stop metrics; CAD hidden (area chart = customer counts; money tabs + Export CSV gated) | Blocked (API 403 + redirect) |
| Settings / Subscription | Full | No access | No access |
| More | Reports + Subscription + Settings + activity + logout | Reports + activity + logout | N/A (not in nav) |

Frontend helpers: `frontend/src/lib/roles.ts` (`canMutateAdmin`, `canMutateDeliveries`, `canSeePricing` — CAD for admins only). Backend uses `require_roles` / `require_roles_active` on mutating routes. Ops surfaces (`/provider/deliveries`, dashboard route) always show `fmtMealCount` (e.g. `2 meals`), never unit price.

## 4. Feature catalog

### 4.1 Authentication

| Feature | Behavior | Acceptance |
|---------|----------|------------|
| Provider email signup | Creates `providers` + `platform_users`, starts **trial**; provider chooses unique alphanumeric `signup_code`; sends email OTP via Resend; **no JWT until verified** | After `/verify-email`, can log in; org + code exist |
| Unified email login | Tries provider then consumer; blocks unverified (`403`) and inaccessible provider subscription | Correct `user_type` session |
| Google Sign-In | Firebase ID token → `POST /api/auth/google`; matches existing account by **email** (primary id) or `google_uid`, then backfills `google_uid`; new provider needs `org_name` + `signup_code`; new consumer needs `signup_code`; email treated verified | Same account as password signup for that email; buttons disabled until Firebase client + fields ready; **501** if server Firebase unset |
| Account linking | Email is the primary identity. Manual signup → later Google login links; Google-only → set password via forgot/reset or Settings/Profile **Set password** | Same `user_id`; both methods work |
| Email verification | 6-digit OTP (10 min); account/tenant created only after `POST /auth/verify-email` | Session issued only after OTP; pending signup kept until verified |
| Forgot / reset password | OTP for any existing account (including Google-only with no prior password); `POST /auth/forgot-password`, `POST /auth/reset-password` | Can log in with new/set password |
| Change / set password | `POST /auth/change-password`: with existing hash requires current; without hash sets first password | `has_password` on `/auth/me`; UI shows Set vs Change |
| Session | Bearer JWT in `tiffin_token` / session in `tiffin_session` localStorage | `/api/auth/me` restores user |
| Logged-in landing | Visiting `/` with an active session redirects to `/provider` or `/consumer` (same as `/login`) | No marketing home flash for returning users after hydrate |

### 4.2 Provider organization

| Feature | Behavior |
|---------|----------|
| Profile | Org name, contact, Interac email, address fields |
| Settings | `cutoff_hours`, default meal price, timezone, signup code (shareable), kitchen logo (512×512), `closed_dates` (holidays), change password |
| Signup code | Chosen by provider at signup; **letters/numbers only** (3–32); stored uppercase; unique case-insensitively across tenants; consumers join with case-insensitive match |
| Kitchen logo | Optional; Camera or Upload on settings → Pillow square resize 512 → R2 (`logos/`) or data-URL fallback |
| Consumer avatar | Optional on signup (deferred upload after verify) and profile; Camera or Upload; 256×256 → R2 (`avatars/`) |
| Closed dates | No delivery generation on dates in `settings.closed_dates` |

### 4.3 Customer CRM (provider)

| Feature | Behavior |
|---------|----------|
| CRUD | List/create/get/patch/delete customers under tenant |
| Customer 360 | `GET /customers/{id}` includes outstanding + deliveries + payments; timeline at `GET /customers/{id}/timeline`; Analysis tab via `GET /customers/{id}/insights?period=` and `?tab=analysis` |
| Filters (UI) | Compact horizontal chips: all \| pending \| paused \| inactive \| high_balance (with counts) |
| Mobile list | Whole customer card opens Analysis (`/provider/customers/{id}?tab=analysis`); action buttons stop propagation |
| Delivery days | Weekday indices `0=Mon … 6=Sun` |
| Meal price | Per-customer CAD amount used on generated deliveries |
| Pause / resume | Date window; deliveries in window generated as `paused`; resume restores future `paused` → `pending` |
| Approve | Self-signup consumers start `pending_approval=true`; provider must approve before deliveries generate |
| Reject | `POST /customers/{id}/reject` with optional reason; sets inactive + `rejected`; notifies consumer account if present |

### 4.4 Deliveries

| Feature | Behavior |
|---------|----------|
| Auto-generate | Idempotent per `(tenant_id, customer_id, delivery_date)`; skips pending-approval, closed dates; respects meal schedule (or legacy delivery days) + pauses; snapshots unit `meal_price` and `quantity` |
| Statuses | `pending`, `delivered`, `missed`, `cancelled`, `paused` |
| Status filter UI | Compact horizontal chips with counts (mobile scroll); **default filter = Pending** |
| Provider mark | One-tap delivered / missed / cancelled (**today or past only**; not future) |
| Consumer cancel | Upcoming `pending` only; blocked for past dates; within `cutoff_hours` before assumed **local noon** (provider timezone) |
| Extra meals | Consumer or provider admin adds tiffins for a date (bumps `quantity`, tracks `extra_quantity`); one stop/day; consumer uses same cutoff as cancel (auto-apply, no approval); priced at unit `meal_price`; outstanding when delivered |

### 4.5 Payments (Interac)

| Feature | Behavior |
|---------|----------|
| Consumer submit | Multipart: `amount`, `reference` (unique per tenant), optional `screenshot` (jpeg/png/webp ≤5MB) |
| Provider record | Admin multipart `POST /payments`: `customer_id`, `amount`, `reference`, optional screenshot — saved as **verified** immediately (`source=provider_recorded`) for offline Interac |
| Screenshot / images UI | **Camera** (mobile rear camera via `capture`) or **Upload** (gallery/files) on payment screenshots, avatars, and kitchen logo |
| Screenshot storage | Cloudflare R2 when configured; else **base64 data URL** fallback |
| Provider verify | Sets verified; notifies consumer (DB + email if Resend set) |
| Provider reject | Requires reason; notifies consumer |
| Status filter UI | Compact horizontal chips (Pending / Verified / Rejected / All); **default = Pending**; label-only (no page-local counts) |
| Outstanding | Σ `meal_price × quantity` for `delivered` − Σ `amount` for `verified` payments (quantity defaults to 1) |
| Meal schedule | Customer `meal_schedule` maps weekday → tiffin count; UI supports same-every-day or custom-per-day; one delivery stop per day still |
| List pagination | Provider payments + customers CRM use cursor pages (Load more, page size 25); statement report uses batched aggregations |

### 4.6 Reports (provider)

- Dashboard remains the day-of-operations cockpit: today’s required meals, pending / delivered / missed / cancelled deliveries, today’s collections, outstanding balance, pending payment approvals, pending customer approvals, and route quick actions.
- Dashboard loads sections independently (summary KPIs, kitchen profile, today’s route) so KPI cards paint as soon as their request finishes—without waiting for the slowest call.
- Analysis (`/provider/analysis`) is the period business-health report: 7d / 30d / 90d / MTD KPIs, charts, receivables aging, top outstanding customers, top collectors, area concentration, and rule-based highlights. Top customer rows deep-link to `/provider/customers/{id}?tab=analysis`.
- Analysis and customer Analysis use shared KPI/section skeletons on first load; period changes keep previous KPIs visible (stale-while-revalidate) with a small spinner on the period toggle, then staggered reveal of charts/lists.
- Per-customer Analysis (customer detail tab) reuses the same analytics kit scoped via `GET /customers/{id}/insights` plus the activity timeline.
- Daily deliveries  
- Outstanding balances  
- Collections  
- Active customers  
- Area summary  
- Dashboard summary  
- Business insights (`GET /reports/business-insights?period=30d`) for Analysis  
- Monthly statement (`GET /reports/statement?month=YYYY-MM`) — tenant or consumer-scoped  
- CSV export supported in UI for report tabs  

### 4.6b Consumer profile

- `PATCH /consumer/me/profile` — phone, address, apartment, postal_code, delivery_days  
- Statement CSV download from payments/profile  

### 4.6c Onboarding

- Provider dashboard checklist when Interac email missing, no customers, or first visit (dismissible)  
- Consumer pending-approval empty state explains “what happens next”
### 4.7 SaaS subscription (provider)

| Feature | Behavior |
|---------|----------|
| Trial | New providers: `trialing` for `TRIAL_DAYS` (default 15) |
| Plans | `monthly` / `quarterly` / `yearly` CAD prices from env |
| Activate (`BILLING_PROVIDER=none`) | Self-activate immediately; stores plan + `current_period_end` |
| Activate (`BILLING_PROVIDER=stripe`) | Returns Stripe Checkout URL; webhook marks active |
| Activate (`BILLING_PROVIDER=manual`) | Provider pays `PLATFORM_INTERAC_EMAIL`, submits Interac ref (+ optional screenshot). Plan **activates immediately**; creates `saas_payment_records` pending; emails `CONTACT_TO_EMAILS`. Platform admin approves/rejects in `admin-frontend`. **Reject** expires subscription (402) until a new payment is submitted. |
| Renew / switch | While already `active`, period **extends** from remaining end |
| Access | `trialing` or `active` required for gated provider/consumer operations |
| Platform admin | Separate app (`admin-frontend/`); JWT `ut=platform`; allowlist `PLATFORM_ADMIN_EMAILS`. Console: **Dashboard**, **Tenants** (+ notes, anonymized kitchen health), **SaaS payments**, **Inbox** (persisted contact form), **Reports** (+ CSV export). Trial digest email via cron/`Email digest now`. Read-mostly except SaaS review, notes, contact status. |

### 4.7b Tax (GST/HST)

- Provider setting `tax_rate_percent` (default `0`).  
- Outstanding uses add-on: `sum(meal × (1 + tax/100)) − payments`.  
- Monthly statements include `tax_rate` and `tax_amount` lines.

### 4.7c Activity audit

- Writers on login, customer soft-delete/reject, payment verify/reject/record, settings patch, plan activate, extra meals.  
- List via `GET /providers/me/activity` or `GET /reports/activity`.  
- Simple list on provider More page.

### 4.8 Notifications

- Written via `notify()` on payment submit/verify/reject, consumer cancel, and consumer signup.  
- Inbox API: `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`.  
- **Inbox UI still deferred** (API is available).

### 4.9 Cancel cutoff

- Delivery treated as **local noon** in provider `settings.timezone` (default `America/Toronto`).  
- Cancel blocked when within `cutoff_hours` of that instant.

---

## 5. End-to-end journeys

### Journey A — Provider onboarding

1. Land on `/` → Sign up → `/signup` (password + confirm; choose alphanumeric signup code)  
2. Verify email via OTP → `/verify-email` → redirect `/provider`  
3. Copy signup code from settings / dashboard; optional kitchen logo  
4. Add or approve customers; open Deliveries for today  

**Done when:** Dashboard loads; signup code visible; customers appear on delivery day after approval.

### Journey B — Consumer joins via code

1. `/consumer-signup` with provider signup code (confirm password; optional photo); invite emails open this URL with `?code=&email=&name=` prefilled  
2. Verify email OTP → account created; if a CRM customer already exists for that email/tenant (from invite), it is reused (no duplicate); otherwise customer is `pending_approval`  
3. Provider approves in Customers (when pending)  
4. Consumer sees deliveries when generated; can change password / avatar in profile  

**Done when:** Consumer home shows upcoming meals after approval + generate.

### Journey C — Daily delivery run

1. Provider opens Deliveries (auto-generates for date)  
2. Marks each stop delivered / missed / cancelled  
3. Dashboard stats update  

**Done when:** Statuses persist; outstanding increases only for `delivered`.

### Journey D — Pay and reconcile

1. Consumer submits Interac amount + reference (+ screenshot), **or** provider admin records an offline payment via **Record payment** (Payments page or customer 360)  
2. Consumer-submitted: provider verifies or rejects; provider-recorded: already verified  
3. Outstanding recalculates; email/notify sent if Resend configured  

**Done when:** Verified payment reduces outstanding on provider and consumer views; reject shows reason path.

### Journey E — Subscription gate

1. Trial expires without activate → provider hits 402 on gated APIs  
2. Provider activates plan on `/provider/subscription`  
3. Access restored  

**Done when:** After activate, provider routes work; banner should clear (see known UX issue: may need reload).

### Journey F — Landing contact

1. Visitor opens `/` → Contact (nav or `#contact`)  
2. Submits name, email, message (optional subject) via form **or** uses mailto links  
3. Backend `POST /api/public/contact` emails both `CONTACT_TO_EMAILS` inboxes via Resend (`Reply-To` = visitor)  

**Done when:** Team receives the message (or visitor emailed directly when Resend is unset).

---

## 6. Business rules (must not break)

1. **Tenant isolation:** Never return or mutate another tenant’s data.  
2. **Outstanding:** `sum(delivered.meal_price × quantity) - sum(verified.payment.amount)` (quantity defaults to 1; tax applies to the line amount).  
3. **Cancel cutoff:** `cutoff_hours` before local noon on delivery date in provider `settings.timezone` (default America/Toronto). Past dates cannot be cancelled.  
4. **Pending approval:** No auto-deliveries until approved.  
5. **Idempotent generation:** Unique index on tenant + customer + date (one stop; multi-tiffin via `quantity`).  
6. **Subscription:** Gated deps use effective status (lazy expiry of trial).  
7. **Integrations degrade:** Missing Resend → log stub; missing R2 → base64; missing Firebase → Google auth 501.  
8. **Mark status:** Provider may mark delivered/missed/cancelled only for `delivery_date <= provider today` and only from `pending`. Undo to `pending` only from delivered/missed/cancelled.  
9. **Payments:** Submit amount must be `> 0`; verify/reject only from `pending`.  
10. **Pause:** `end` must be on or after `start`.
11. **Meal schedule:** Provider sets weekday→quantity; consumers may change days only (new days get qty 1).  
12. **Extra meals:** Add-only bump to delivery `quantity` (cap 20); consumer before cancel cutoff; provider admin anytime for future/today pending; off-schedule days create a new pending stop.

---

## 7. UI / UX requirements

- Mobile-first; provider bottom nav + desktop sidebar; consumer bottom nav.  
- Design tokens: [`design_guidelines.json`](../design_guidelines.json) (Cabinet Grotesk / Satoshi, terracotta `#D95D39`, sage `#4A7C59`).  
- Preserve existing `data-testid` attributes used in QA.  
- Toasts via Sonner.

---

## 8. MVP shipped vs Phase 2

### Shipped (MVP)

- Provider/consumer auth (email + Google when Firebase configured)  
- CRM, deliveries, Interac payments, reports, CSV  
- Trial + plan activate (`BILLING_PROVIDER=none` by default)  
- Resend + R2 with graceful fallback  
- Firebase Admin + client wiring  
- Next.js App Router frontend (TypeScript)

### Wave A (shipped)

| Item | Notes |
|------|-------|
| Subscription banner refresh | Unified `zorvia:subscription-refresh` event |
| Timezone cancel cutoff | Provider `settings.timezone` local noon (default America/Toronto) |
| Notification inbox | `GET/POST /notifications`; bell UI; emits on pay/cancel/signup |
| Delivery day ops | FSA sort, bulk mark delivered, sticky next stop |
| Interac reconcile | Search, outstanding hint, batch verify, unique references; admin **Record payment** for offline Interac |
| Security hardening | Prod JWT guard, rate limits, soft-delete, upload limits |

### Wave B (shipped)

| Item | Notes |
|------|-------|
| Customer 360 | Detail page + timeline; list filters; name links |
| Reject pending | API + list UI; notifies consumer |
| Consumer schedule/profile | Cancel any upcoming pending; editable profile |
| Pause resume | Future paused deliveries restored to pending |
| Holidays | `closed_dates` on provider settings; engine skips |
| Onboarding checklist | Provider dashboard + consumer pending empty state |
| Monthly statements | `GET /reports/statement`; CSV on reports/payments/profile |

### Wave C (shipped)

| Item | Notes |
|------|-------|
| Staff / driver / viewer | Access matrix in §3; FE `lib/roles.ts`; layout redirects; More link filter; dashboard marks admin-only; drivers land on `/provider/deliveries` (never call dashboard APIs) |
| Route order | `PATCH /deliveries/route-order`; up/down + Open in Maps |
| PWA | `manifest.webmanifest`, `sw.js`, offline delivery status queue |
| Live board | Deliveries poll 10s when focused; nav badges every 45s |
| Mobile listings | Customers + Reports: stacked cards below `md`; dense tables from `md+` (no horizontal scroll) |
| Delivery filters | Compact status chips + search; route reorder on `sm+` only |
| Bulk confirms | Mark all delivered + Verify selected require AppSheet confirmation before applying |
| Action button colors | `btn-danger` for delete/reject/cancel-delivery; `btn-secondary` for deliver/verify; `btn-outline` for dismiss Cancel |
| CSV import + invites | Sample CSV download on Customers; `POST /customers/import` (supports driver_email + delivery_sequence); invite HTML → `/consumer-signup?code=` |
| Customer route master | Optional `driver_id` + `delivery_sequence`; unique per driver pool; insert/move at N auto-shifts later stops; new deliveries inherit `route_order` + driver |
| SMS stub | `send_sms` + `sms_notifications` setting; cancel confirmation |

### Wave D (shipped)

| Item | Notes |
|------|-------|
| Stripe billing (graceful) | `BILLING_PROVIDER=none\|stripe`; Checkout URL; webhook; 501 if keys missing |
| Period extend on renew | `activate_plan` extends from remaining period when active |
| Audit log | `audit.log_activity`; writers; More-page activity list |
| GST/HST | `tax_rate_percent`; outstanding add-on; statement tax lines |
| Brand rename | User-facing **Zorvia** (layouts, landing, emails) |

### Phase 2 / deferred

| Item | Notes |
|------|-------|
| Notification inbox UI | API exists; UI deferred |
| Stripe Customer Portal / recurring polish | Checkout + webhook shipped; portal optional |
| Multi-currency | CAD assumptions |
| WhatsApp | Not implemented (SMS stub only) |

---

## 9. Non-goals (do not invent)

- Do not invent a notifications **inbox UI** without a product request (API already exists).  
- Do not change tenancy model (`tenant_id = provider_id`).  
- Do not commit secrets; document env **names** only.
- Stripe is optional via `BILLING_PROVIDER`; leave default `none` unless tasked to enable.
