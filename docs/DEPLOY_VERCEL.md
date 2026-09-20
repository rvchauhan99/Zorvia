# Deploy notes (frontends)

## Vercel — consumer/provider app

| Setting | Value |
|---------|--------|
| GitHub repo | `rvchauhan99/Zorvia` (public) |
| Root Directory | `frontend` |
| Framework | Next.js |
| API | Private `mealhq-api` — set `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` to **`https://api2.mealhq.ca`** (or local `http://127.0.0.1:8000` for preview against local API) |

## Vercel — platform admin

| Setting | Value |
|---------|--------|
| GitHub repo | `rvchauhan99/Zorvia` (public) |
| Root Directory | `admin-frontend` |
| API | Same as above (`https://api2.mealhq.ca`) |

Backend deploys: sibling `mealhq-api` → [DEPLOY_VULTR.md](../../mealhq-api/docs/DEPLOY_VULTR.md). Cloud Run docs are rollback-only.
