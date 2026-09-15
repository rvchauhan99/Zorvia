# Day-cycle subscription — provider onboarding

**Who this is for:** Kitchen owners turning on Day-cycle billing.  
**What it covers:** Settings setup, adding customers, CSV import, collections, and Adjust cycle.  
**Brand:** MealHQ

Deeper ops and API detail (for engineers): private **mealhq-api** repo → `docs/CYCLE_SUBSCRIPTION.md`.

---

## 1. What Day-cycle is

Day-cycle charges a **flat plan fee every N plan days**, counted from each customer’s **next payment collection date**.

It is **not** a calendar-month plan. There is no “collection day of the month” (1–31). Each customer has their own next collection date.

| Behavior | Day-cycle |
|----------|-----------|
| What you charge | Always the plan fee (“Fee per cycle”) |
| How often | Every N plan days (kitchen default is often 18–20; each plan can set its own length) |
| Weekends / kitchen closed days | Skipped when counting plan days |
| Skips, cancellations, pauses | Do **not** change the bill and do **not** extend the cycle |
| Late payment | Does **not** move the next collection date |
| Unpaid cycle | Next cycle still comes due — balance goes overdue |

A **plan day** is a weekday ticked on the plan template that is **not** on your kitchen closed dates.

---

## 2. When to use it

| Plan | Use when… |
|------|-----------|
| **Day-cycle** | Customers renew every N plan days, each with their own next collection date (common for 20 / 24 / 26-day plans) |
| **Fixed Monthly** | Same fee every calendar month on a day of the month |
| **Adjustable Monthly** | Monthly fee that can change with cancellations / delivery rules |
| **Per-meal** | Bill for each delivered meal |

You can mix policies on one kitchen (some Day-cycle, some per-meal, etc.).

---

## 3. Kitchen setup (day one)

1. Open **Settings → Subscription Policy**.
2. Turn on **Default customers to monthly subscription** if new customers should inherit subscription billing.
3. Choose **Day-cycle subscription** as the default policy variant.
4. Set **Default cycle length (plan days)** — used when a plan leaves its own cycle length blank.
5. Edit **Plan templates**:
   - **Fee per cycle (CAD)**
   - **Cycle length (plan days)** (or leave blank to use the kitchen default)
   - Weekday ticks (Mon–Fri, Mon–Sat, etc.) — these are the days that count toward N
6. Add **kitchen closed dates** (holidays) under Operations / closed dates as you normally would.
7. Set **tax** if you charge GST/HST.

**Collection day (1–31) is not used** for Day-cycle. Settings hides it when Day-cycle is selected.

Also add at least one **driver** under Team — import requires `driver_name` to match a real staff name.

---

## 4. Plans in plain words

- **Mon–Fri, 20 plan days** — about four weeks of weekday service, skipping weekends and closed dates.
- **Mon–Sat, 24 plan days** — longer cycle; Saturday counts, Sunday and closed dates do not.
- Leave a plan’s cycle length blank to use the kitchen **Default cycle length**.

Pick a plan for every Day-cycle customer. The plan sets both the fee and which weekdays count.

---

## 5. Add customers in CRM

For each Day-cycle customer:

1. Set **Billing policy** to **Day-cycle subscription** (or **Inherit** if the kitchen default is Day-cycle).
2. Choose a **plan** (Mon–Fri, Mon–Sat, etc.).
3. Set **Next payment collection date** — required. This is when their current / next collection is due.
4. Optional: **Opening balance** for debt carried over from before MealHQ.

| Next payment collection date | Meaning |
|------------------------------|---------|
| In the future | Nothing owed for that cycle yet |
| Today or in the past | That cycle is already due (and may be overdue) |

---

## 6. Import customers

### Steps

1. **Customers → Import**.
2. Choose **Day-cycle subscription** (this sets the policy for the file — it is **not** a CSV column).
3. Download the sample CSV from the sheet, or use [samples/mealhq-customers-cycle-fixed-sample.csv](./samples/mealhq-customers-cycle-fixed-sample.csv).
4. Replace driver names and plan names with your Settings values, then upload.

### Required columns

`name`, `phone`, address fields (`address`, `city`, `province`, `postal_code`), `monthly_plan`, `lunch_qty` and/or `dinner_qty`, `driver_name`, `next_payment_date`

### Strongly recommended

`joining_date`, `opening_balance`, `email`, `apartment`, `notes`, `meal_type`

### Do

- Use plan names exactly as in Settings (e.g. `Mon-Fri`, `Mon-Sat`).
- Use `yyyy-mm-dd` for dates.
- Put prior debt in `opening_balance` (positive = they owe you).

### Don’t

- Do **not** add `payment_collection_day` — Day-cycle rejects it.
- Do **not** add `last_collection_status` — Day-cycle rejects it.
- Do **not** invent a `billing_policy` column — you already chose Day-cycle in the Import sheet.

### Sample CSV

Same file the Import sheet downloads as `mealhq-customers-cycle-fixed-sample.csv`:

```csv
name,phone,email,address,apartment,city,province,postal_code,monthly_plan,lunch_qty,dinner_qty,driver_name,joining_date,next_payment_date,opening_balance,notes,meal_type
Aarav Sharma,4165551212,aarav@example.com,45 Bloor St W,Unit 302,Toronto,ON,M5S 1M2,Mon-Fri,0,2,Alex Driver,2026-01-15,2026-10-01,0,Gate code 12,regular
Priya Patel,6475559898,priya@example.com,100 King St E,,Mississauga,ON,L5B 3Y4,Mon-Fri,1,1,Alex Driver,2025-11-01,2026-10-08,150,Carried-over balance,Jain
Neha Gupta,9055553344,neha@example.com,12 Queen St W,Suite 5,Brampton,ON,L6Y 1N2,Mon-Sat,1,0,Alex Driver,2026-03-01,2026-10-20,0,Leave at concierge,FASTING
```

Replace `Alex Driver` with a driver from **Settings → Team**, and plan names with your real plan templates.

---

## 7. Running the kitchen

Use **Customer subscriptions** (`/provider/monthly-dues`):

- **Cycle** column — cycle number, length, and period dates
- **Renewal date** — next (or current overdue) collection
- **Quick Renew** — record a full plan-fee payment
- **Adjust cycle** — move a collection date (see below)

Also useful:

- **Reports → Outstanding** — Day-cycle rows show when overdue
- **Reports → Amounts due / Payment due** — who to collect from by date
- **Customer detail** — Day-cycle card with fee, next collection, and recent adjustments

Remember: paying late does **not** push the schedule. Unpaid cycles still accrue.

---

## 8. Adjust cycle

When a customer needs more time, or you need to re-date a collection:

1. Open **Adjust cycle** on Customer subscriptions (or from the customer’s Day-cycle card).
2. Choose **which collection**:
   - **The next upcoming collection** — move a future due date
   - **The collection already due (grant grace)** — push an overdue/current due date forward
3. Choose **how to move it**:
   - **Postpone by N plan days** — counts plan weekdays, skips closed dates
   - **Set an exact date**
4. Optional reason (saved on the customer for audit).

Cycles already collected stay as they were — Adjust cycle never re-bills or skips a settled cycle.

---

## 9. What to tell customers

Customers on Day-cycle see on the consumer home:

- Subscription fee every **N plan days**, regardless of skips
- **Next renewal** date

You can say:

> Your plan is $X every N service days. Skipping a meal does not change the fee or the renewal date. Ask us if you need the collection date moved.

---

## 10. Quick checklist

- [ ] Settings → Subscription Policy → Day-cycle selected
- [ ] Default cycle length set
- [ ] Plan templates have Fee per cycle, cycle length (or blank), and weekdays
- [ ] Kitchen closed dates entered
- [ ] Tax set if needed
- [ ] At least one driver in Team
- [ ] Customers have a plan + **Next payment collection date**
- [ ] Import uses Day-cycle policy, `monthly_plan` + `next_payment_date`, no collection-day columns
- [ ] Team knows Adjust cycle for grace / postponements
- [ ] Customer app messaging matches “fee every N plan days”
