# Deploy notes (frontends)

## Vercel — consumer/provider app

| Setting | Value |
|---------|--------|
| GitHub repo | `rvchauhan99/Zorvia` (public) |
| Root Directory | `frontend` |
| Framework | Next.js |
| API | Private `mealhq-api` on Cloud Run — set `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` |

## Vercel — platform admin

| Setting | Value |
|---------|--------|
| GitHub repo | `rvchauhan99/Zorvia` (public) |
| Root Directory | `admin-frontend` |
| API | Same Cloud Run URL |

Backend deploys: see private repo `rvchauhan99/mealhq-api` → `docs/DEPLOY_CLOUD_RUN.md`.
