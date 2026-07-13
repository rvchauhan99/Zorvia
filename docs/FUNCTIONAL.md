# Zorvia — Functional Specification

**Product brand:** Zorvia  
**UI / API display name:** Tiffin OS (rename pending)  
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
| **Consumer** | Meal subscriber under one provider | See balance and deliveries, cancel before cutoff, submit payments |

There is **no staff/driver role** in MVP (Phase 2).

---

## 3. Tenancy and access model

- One **provider** = one **tenant**.
- `tenant_id` on all scoped records equals `provider_id`.
- Provider users live in `platform_users` (`role=admin` today).
- Consumers live in `consumer_accounts` linked to a `customers` row under that tenant.
- JWT claims: `sub` (user id), `ut` (`provider` \| `consumer`), `tid` (tenant id).
- Expired / inaccessible provider subscription:
  - Provider active routes → **402** → UI redirects to `/provider/subscription`
  - Consumer routes → **403** with message that provider subscription is inactive

---

## 4. Feature catalog

### 4.1 Authentication

| Feature | Behavior | Acceptance |
|---------|----------|------------|
| Provider email signup | Creates `providers` + `platform_users`, starts **trial**, returns JWT; optional welcome email | Can log in; org + signup code exist |
| Unified email login | Tries provider then consumer; consumer blocked if provider inaccessible | Correct `user_type` session |
| Google Sign-In | Firebase ID token → `POST /api/auth/google`; new provider needs `org_name`; new consumer needs `signup_code` | Buttons disabled until Firebase client + fields ready; **501** if server Firebase unset |
| Session | Bearer JWT in `tiffin_token` / session in `tiffin_session` localStorage | `/api/auth/me` restores user |

### 4.2 Provider organization

| Feature | Behavior |
|---------|----------|
| Profile | Org name, contact, Interac email, address fields |
| Settings | `cutoff_hours`, default meal price, timezone, signup code (shareable) |
| Signup code | Unique per provider; consumers use it to join |

### 4.3 Customer CRM (provider)

| Feature | Behavior |
|---------|----------|
| CRUD | List/create/get/patch/delete customers under tenant |
| Delivery days | Weekday indices `0=Mon … 6=Sun` |
| Meal price | Per-customer CAD amount used on generated deliveries |
| Pause / resume | Date window; deliveries in window generated as `paused` |
| Approve | Self-signup consumers start `pending_approval=true`; provider must approve before deliveries generate |

### 4.4 Deliveries

| Feature | Behavior |
|---------|----------|
| Auto-generate | Idempotent per `(tenant_id, customer_id, delivery_date)`; skips pending-approval; respects delivery days + pauses |
| Statuses | `pending`, `delivered`, `missed`, `cancelled`, `paused` |
| Provider mark | One-tap delivered / missed / cancelled |
| Consumer cancel | Only `pending`; blocked inside `cutoff_hours` before assumed **noon UTC** delivery time |

### 4.5 Payments (Interac)

| Feature | Behavior |
|---------|----------|
| Consumer submit | Multipart: `amount`, `reference`, optional `screenshot` |
| Screenshot storage | Cloudflare R2 when configured; else **base64 data URL** fallback |
| Provider verify | Sets verified; notifies consumer (DB + email if Resend set) |
| Provider reject | Requires reason; notifies consumer |
| Outstanding | Σ `meal_price` for `delivered` − Σ `amount` for `verified` payments |

### 4.6 Reports (provider)

- Daily deliveries  
- Outstanding balances  
- Collections  
- Active customers  
- Area summary  
- Dashboard summary  
- CSV export supported in UI for report tabs  

### 4.7 SaaS subscription (provider)

| Feature | Behavior |
|---------|----------|
| Trial | New providers: `trialing` for `TRIAL_DAYS` (default 15) |
| Plans | `monthly` / `quarterly` / `yearly` CAD prices from env |
| Activate | **Self-activate without payment gateway** (MVP); stores plan + `current_period_end` |
| Access | `trialing` or `active` required for gated provider/consumer operations |

### 4.8 Notifications

- Written to `notifications` on payment verify/reject.  
- **No inbox list API or UI in MVP** (data is stored for Phase 2).

---

## 5. End-to-end journeys

### Journey A — Provider onboarding

1. Land on `/` → Sign up → `/signup`  
2. Create org + admin account → redirect `/provider`  
3. Copy signup code from settings  
4. Add or approve customers; open Deliveries for today  

**Done when:** Dashboard loads; signup code visible; customers appear on delivery day after approval.

### Journey B — Consumer joins via code

1. `/consumer-signup` with provider signup code  
2. Account created; customer `pending_approval`  
3. Provider approves in Customers  
4. Consumer sees deliveries when generated  

**Done when:** Consumer home shows upcoming meals after approval + generate.

### Journey C — Daily delivery run

1. Provider opens Deliveries (auto-generates for date)  
2. Marks each stop delivered / missed / cancelled  
3. Dashboard stats update  

**Done when:** Statuses persist; outstanding increases only for `delivered`.

### Journey D — Pay and reconcile

1. Consumer submits Interac amount + reference (+ screenshot)  
2. Provider verifies or rejects  
3. Outstanding recalculates; email sent if Resend configured  

**Done when:** Verified payment reduces outstanding; reject shows reason path.

### Journey E — Subscription gate

1. Trial expires without activate → provider hits 402 on gated APIs  
2. Provider activates plan on `/provider/subscription`  
3. Access restored  

**Done when:** After activate, provider routes work; banner should clear (see known UX issue: may need reload).

---

## 6. Business rules (must not break)

1. **Tenant isolation:** Never return or mutate another tenant’s data.  
2. **Outstanding:** `sum(delivered.meal_price) - sum(verified.payment.amount)`.  
3. **Cancel cutoff:** `cutoff_hours` before noon UTC on delivery date (documented simplification).  
4. **Pending approval:** No auto-deliveries until approved.  
5. **Idempotent generation:** Unique index on tenant + customer + date.  
6. **Subscription:** Gated deps use effective status (lazy expiry of trial).  
7. **Integrations degrade:** Missing Resend → log stub; missing R2 → base64; missing Firebase → Google auth 501.

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
- Trial + plan activate (no gateway)  
- Resend + R2 with graceful fallback  
- Firebase Admin + client wiring  

### Phase 2 / deferred

| Item | Notes |
|------|-------|
| Real SaaS billing (Stripe etc.) | Activate is placeholder |
| Staff / driver roles | Single admin only |
| Consumer invite email + tokenized link | `ConsumerInviteAccept` model exists; **no routes** |
| Notification inbox UI | Writes only |
| Audit log UI | `activity_logs` indexed; **no writers found** |
| CSV bulk customer import | Not implemented |
| SMS / WhatsApp | Not implemented |
| Multi-currency | CAD assumptions |
| Fix trial banner live refresh | Known MEDIUM UX bug |

---

## 9. Non-goals (do not invent)

- Do not add Stripe checkout unless explicitly tasked.  
- Do not invent a notifications inbox without a product request.  
- Do not change tenancy model (`tenant_id = provider_id`).  
- Do not commit secrets; document env **names** only.
