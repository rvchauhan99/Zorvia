# MealHQ Social Media Setup (Canada — Facebook + Instagram)

**Goal:** Reach Canadian tiffin providers and local food businesses.  
**Channels:** Facebook Page + Groups; Instagram Business.  
**Canonical site:** https://www.mealhq.ca  
**Primary CTA:** Start free → https://www.mealhq.ca/signup  
**Secondary CTA:** For providers → https://www.mealhq.ca/for-tiffin-providers

> **Agent limitation:** Meta requires a real person to create/own accounts (email/SMS verification, CAPTCHA, Personal Profile → Business Page). An agent cannot finish live Facebook/Instagram account creation for you. This doc is the full setup kit: copy, naming, steps, and content so you create accounts in ~30–45 minutes.

---

## 0. What you must do yourself (Meta)

1. Use **your** personal Facebook account (or create one with a real name — Meta bans fake personal profiles).
2. Create a **Facebook Page** for MealHQ (not a personal profile as the brand).
3. Convert / create **Instagram Professional** and link it to that Page via Meta Business Suite.
4. Complete phone/email verification and any “confirm you’re human” steps.

**Do not** create a second personal profile named “MealHQ” — that violates Meta rules and gets disabled.

---

## 1. Locked account details (2026-07-19)

| Asset | Locked value |
|-------|----------------|
| Page Admin (personal FB) | **Ravatrajsinh Chauhan** (existing personal account) |
| Facebook Page name | **MealHQ** |
| Facebook username | **`mealhq.ca`** (Meta lowercases; try this first). Backup: `mealhqca` |
| Instagram username | **`mealhq.ca`** (periods allowed). Backup: `mealhqca` |
| IG display name | **MealHQ** |
| Category (FB + IG) | **Software Company** (add Business Service if offered) — **not** Restaurant |
| Page city / market | **Toronto, Ontario, Canada** |
| Website | https://www.mealhq.ca |
| Public email | **ravatrajsinh@gmail.com** (swap to `hello@mealhq.ca` when ready) |
| Public phone | **Leave blank for now** — see phone note below |
| Private / recovery phone | +91 82384 75610 (use only for Meta 2FA / SMS verify — not on the Page) |
| Brand assets | Profile: `social/page/mealhq-profile-1024.png` (= `mealhq-icon-1024.png`). Cover: `social/page/mealhq-fb-cover-1640x924.png`. Do not use bowl-split `mealhq-mark.png` on social. |

Brand colours: Lagoon `#0E8F8B`, Mist `#F4F7F6`, Ink `#0B1220`, Mango `#F5A524`.

### Upload these files (ready-made)

**Canonical social mark:** `mealhq-icon-1024.png` (M + route) — same as your live Page profile.  
Do not use the bowl-split `mealhq-mark.png` for social.

```
frontend/public/brand/social/
  page/           ← profile, cover (not posts)
  post-01-live/   ← first post only
docs/social-content/
  post-01-live/   ← caption + same assets
```

| Upload as | File |
|-----------|------|
| **FB + IG profile** | `social/page/mealhq-profile-1024.png` |
| **Facebook cover** | `social/page/mealhq-fb-cover-1640x924.png` |
| **First post** | `social/post-01-live/feed-1080.png` + [`docs/social-content/post-01-live/POST.md`](./social-content/post-01-live/POST.md) |

See [`frontend/public/brand/social/README.md`](../frontend/public/brand/social/README.md).

### Phone + Canada accuracy (important)

An **Indian (+91) number on the public Page does not make Meta treat you as “more Canadian.”** It can do the opposite for Canadian kitchen owners (trust/looks offshore).

| Do | Don’t |
|----|--------|
| Set Page location to **Toronto, ON, Canada** | Put +91 as the public call button |
| Use Canada website + Canada-focused copy | Rely on phone country for “Canada ranking” |
| Keep +91 for **login / 2FA only** | Expect ads geo to follow your phone country if Page location + ad set are Canada |

Meta Page/ad **targeting** follows what you set in Business Suite / Ads Manager (Canada, Toronto), not your personal SIM — as long as location fields and creatives are Canada. Later: add a Canadian virtual number (e.g. VoIP) if you want a public call option.

---

## 2. Paste-ready bios (final for your setup)

**Positioning (lock this):** MealHQ is **software to manage a tiffin / meal-subscription business**.  
We do **not** cook, sell, or deliver meals. Kitchen owners use MealHQ to run customers, schedules, deliveries, and payments.

### Instagram bio (strong — paste this)

```
Business software for tiffin kitchens 🇨🇦
Not a meal service — manage yours.
Customers · Schedules · Deliveries · Payments
Toronto → mealhq.ca
```

Alternate (if character limit cuts lines):

```
Tiffin business software — not a meal seller.
Manage customers, schedules, deliveries & payments.
🇨🇦 Toronto · Start free → mealhq.ca
```

### Facebook Page — Short description

```
MealHQ is business management software for Canadian tiffin and meal-subscription kitchens. We don’t sell meals — we help you run customers, schedules, deliveries, and payments in one place. Toronto / GTA · nationwide.
```

### Facebook Page — About / long description

```
MealHQ is software for tiffin providers and homemade meal businesses in Canada.

Important: MealHQ is not a food delivery app and we do not sell tiffins or meals. Your kitchen cooks and serves your customers. MealHQ is the HQ that helps you manage the business.

Four cores in one place:
• Customer management — subscribers, profiles, signup codes
• Schedule management — meal plans, pauses, weekly rhythm
• Delivery management — daily routes, status, extras
• Payment management — Interac tracking and billing clarity

Built for Toronto / GTA and kitchens across Canada. Replace WhatsApp + spreadsheet chaos with one ops hub.

Start free (providers): https://www.mealhq.ca/signup
Learn more: https://www.mealhq.ca/for-tiffin-providers
Contact: ravatrajsinh@gmail.com
```

### Contact fields (when Meta asks)

| Field | Enter |
|-------|--------|
| Email | ravatrajsinh@gmail.com |
| Phone | *(skip / leave empty)* |
| Address / city | Toronto, ON, Canada |
| Website | https://www.mealhq.ca |
| Category | **Software Company** (keep — not Restaurant / Food Delivery) |

### Profile / cover guidance

| Surface | Spec | Content |
|---------|------|---------|
| FB profile | 170×170 min (square) | Stacked MealHQ logo on Lagoon or white |
| FB cover | 820×312 (desktop) | Horizontal logo + line: “Tiffin software for Canadian kitchens” + mealhq.ca |
| IG profile | Square | Same stacked logo |
| IG highlight covers | Circle icons | Soft Mist bg + Lagoon icons: Product, How it works, Canada, Stories |

---

## 3. Click-through: Facebook Page (≈15 min)

1. facebook.com → logged in as **you** → **Pages** → **Create new Page**.
2. Name: **MealHQ** · Category: **Software Company** (add **Business Consultant** if allowed).
3. Bio: paste Short description above.
4. Add website, email, city (Toronto or your HQ city), Canada.
5. Upload profile + cover from brand folder (export PNG).
6. **Settings → Page transparency / Country** — ensure Canada visibility is fine.
7. Create username: try `@mealhq` then `@mealhqca`.
8. Turn on **Professional / Meta Business Suite** for the Page.
9. **Create ad account later** (optional) — CAD currency, Canada.

### Facebook Groups strategy (reach providers)

Do **not** spam. Soft value-first:

| Action | Detail |
|--------|--------|
| Join | Local “Indian groceries / tiffin / homemade food / kitchen business” Groups in GTA, Surrey, Brampton, Mississauga, Calgary, Edmonton |
| Post cadence | 1 helpful post / week max per group (after reading rules) |
| Angle | Tips: route planning, Interac records, pause policies — end with soft CTA |
| Own Group (later) | “Canadian Tiffin Operators — MealHQ Community” once you have 10+ customers |

Example Group post (adapt per rules):

```
For tiffin owners in [City]: what’s the hardest part of daily deliveries — routes, payments, or last-minute pauses?

We built MealHQ for Canadian kitchens dealing with exactly that (Interac + subscriber schedules). Happy to share a free checklist if useful — or try mealhq.ca
```

---

## 4. Click-through: Instagram Professional (≈15 min)

1. Instagram app → profile → **☰** → **Settings and activity** → **Account type and tools** → **Switch to Professional** → **Business**.
2. Category: **Software Company** / **Product/Service**.
3. Connect to the **MealHQ Facebook Page**.
4. Username + display name + bio (paste from §2).
5. Contact options: Email + Website button → https://www.mealhq.ca/signup  
   (or Linktree later; prefer single CTA early).
6. Add location: Canada / Toronto if prompted.
7. Create Highlights: **Product**, **How it works**, **Canada**, **FAQ**.

### First 9 posts (grid plan)

Post in this order so the grid looks intentional:

1. Brand — “MealHQ · Tiffin software for Canada”
2. Problem — WhatsApp + Excel chaos
3. Solution — one HQ for routes & subscribers
4. Feature — daily delivery board
5. Feature — Interac payment tracking
6. Audience — “Built for homemade kitchens”
7. City — GTA / Toronto focus
8. Social proof placeholder — “Early kitchens onboard”
9. CTA — Free signup → mealhq.ca

Caption template:

```
[One problem line]

[One outcome line]

🇨🇦 Built for Canadian tiffin providers.

Start free → link in bio
#TiffinBusiness #CanadianFoodBusiness #MealHQ #GTAFood #HomeCookedMeals
```

Hashtag set (rotate; don’t dump 30):

`#Tiffin` `#TiffinService` `#MealSubscription` `#CanadianBusiness` `#TorontoFood` `#SurreyFood` `#HomeBasedBusiness` `#FoodEntrepreneur` `#DesiFood` `#MealHQ`

---

## 5. Meta Business Suite (do once)

1. business.facebook.com → claim **MealHQ** Page + IG.
2. Add only people who need access (Admin / Editor).
3. Turn on **WhatsApp** only if you will reply there (optional; product already reduces WhatsApp ops).
4. Link Google Analytics later for ads (Measurement ID `G-…`) when you run Meta Ads.

---

## 6. Content pillars (weekly)

| Day | Pillar | Example |
|-----|--------|---------|
| Mon | Ops tip | “How to cut missed deliveries this week” |
| Wed | Product | 15s screen recording of delivery board |
| Fri | Community | Question for kitchen owners in GTA/YVR |

Language: **English first**; add Punjabi/Hindi captions later for GTA/Surrey reach (not auto-translate spam).

---

## 7. Ads (phase 2 — after organic setup)

- Objective: **Leads** or **Traffic** → https://www.mealhq.ca/signup or `/for-tiffin-providers`
- Geo: Canada → start **Ontario** (GTA) + **BC Metro Vancouver**
- Audience interests: small business, restaurant owners, Indian cuisine, food delivery (test narrowly)
- Budget: CAD; creative in Lagoon/Mist brand colours
- Track: GA4 key events `signup_complete`, `signup_start`

---

## 8. Your filled checklist

```
Legal / display name: MealHQ
Public email: ravatrajsinh@gmail.com
Phone (public): none — +91 kept private for 2FA only
City for Page: Toronto, ON, Canada
FB username: mealhq.ca (backup mealhqca)
IG username: mealhq.ca (backup mealhqca)
Page Admin: Ravatrajsinh Chauhan
Logo: existing brand PNGs
Privacy: https://www.mealhq.ca/privacy
Terms: https://www.mealhq.ca/terms
```

---

## 9. Your create order (do this now)

1. Facebook (logged in as Ravatrajsinh) → **Pages** → **Create Page** → name **MealHQ**.
2. Category **Software Company** · City **Toronto, Ontario** · Country **Canada**.
3. Paste Short + About from §2 · email · website · **no public phone**.
4. Profile: `social/page/mealhq-profile-1024.png` · Cover: `social/page/mealhq-fb-cover-1640x924.png`.
5. Claim username **`mealhq.ca`** (if taken → `mealhqca`).
6. Instagram → Professional / Business → link to MealHQ Page → same username + bio from §2.
7. Website button → https://www.mealhq.ca/signup
8. Publish 3 posts from §4 grid (brand / problem / CTA).

---

## 10. Done when

- [ ] Facebook Page live with username + About filled
- [ ] Instagram Professional linked to that Page
- [ ] Bios + website CTA live · public phone empty
- [ ] Profile/cover match MealHQ brand
- [ ] 3–9 starter posts or Stories published
- [ ] Joined 5–10 relevant FB Groups (no spam yet)
- [ ] Meta Business Suite access confirmed for Ravatrajsinh

Related: [`SEO.md`](./SEO.md) · site https://www.mealhq.ca
