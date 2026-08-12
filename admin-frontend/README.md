# MealHQ platform admin

Separate Next.js app for MealHQ operators.

```bash
# from repo root
npm run install:admin
cp admin-frontend/.env.example admin-frontend/.env
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

## Environment

See [`.env.example`](.env.example). The only app-level config is the API target for the
`/api` rewrite; everything else above is configured on the backend.

| | Local | Production |
|---|---|---|
| Admin UI | `http://localhost:3001` | `https://admin.mealhq.ca` |
| `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` | `http://127.0.0.1:8000` | `https://zorvia-api-wziqzscuaq-nn.a.run.app` |

On Vercel (Root Directory `admin-frontend`) set both variables in the dashboard rather than
in a committed file. The admin origin is already allowed in the API's `CORS_ORIGINS`; set
`ADMIN_APP_URL=https://admin.mealhq.ca` on Cloud Run so email deep links resolve.
