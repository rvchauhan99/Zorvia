# MealHQ frontends — Development

**Last updated:** 2026-09-20  
Workspace: [MealHQ.code-workspace](../../MealHQ.code-workspace) · API map: sibling `mealhq-api/docs/WORKSPACE.md`

## Ports

| Service | URL |
|---------|-----|
| Provider + consumer | `http://localhost:3000` |
| Platform admin | `http://localhost:3001` |
| Local API | `http://127.0.0.1:8000` (sibling mealhq-api) |
| Production API | `https://api2.mealhq.ca` |

## Run

```bash
cd Zorvia-main
npm run dev:frontend   # :3000 — rewrites /api → BACKEND_URL or http://127.0.0.1:8000
npm run dev:admin      # :3001
```

Start the API from a sibling clone of **mealhq-api** (see that repo’s `docs/DEVELOPMENT.md`).

## Env (never commit)

- `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` — API base (local or `https://api2.mealhq.ca`)
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client (`mealhq-ca`)

Vercel: [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md).
