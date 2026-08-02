# Frontend (`frontend/`)

MealHQ provider + consumer Next.js app. Sibling: `admin-frontend/`. API: private [`mealhq-api`](https://github.com/rvchauhan99/mealhq-api).

## Local

```bash
cp .env.example .env
# NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000  (run mealhq-api locally)
npm install
npm run dev
```

## Vercel

- Connect GitHub repo **`rvchauhan99/Zorvia`** (public)
- **Root Directory:** `frontend`
- Env: `NEXT_PUBLIC_BACKEND_URL` / `BACKEND_URL` → Cloud Run URL (`https://zorvia-api-….run.app`)
- Keep `NEXT_PUBLIC_FIREBASE_*` for Google Sign-In

After `next build` on Vercel, `scripts/vercel-link-monorepo-root.js` still links `.next` / `node_modules` to the repo root when a parent `package.json` exists.
