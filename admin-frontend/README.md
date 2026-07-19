# MealHQ platform admin

Separate Next.js app for MealHQ operators.

```bash
# from repo root
npm run install:admin
npm run dev:admin   # http://localhost:3001
```

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Platform operator login |
| `/` | Dashboard KPIs + trial digest button |
| `/tenants` | Kitchen directory + CSV export |
| `/tenants/[id]` | Detail, kitchen health, support notes, SaaS history |
| `/saas-payments` | Pending / approved / rejected Interac SaaS |
| `/saas-payments/[id]` | Approve / reject |
| `/inbox` | Contact form messages |
| `/inbox/[id]` | Mark read / archive |
| `/reports` | SaaS revenue, growth, usage (+ CSV on SaaS) |

Requires backend with:

- `PLATFORM_ADMIN_EMAILS`
- `PLATFORM_ADMIN_BOOTSTRAP_PASSWORD` (first login)
- `PLATFORM_CRON_SECRET` (Cloud Scheduler trial digest)
- `ADMIN_APP_URL` for email deep links
- `BILLING_PROVIDER=manual` + `PLATFORM_INTERAC_EMAIL` for SaaS Interac flow

Set `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` if the API is not on `http://127.0.0.1:8000`.
