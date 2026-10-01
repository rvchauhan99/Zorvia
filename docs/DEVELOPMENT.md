# MealHQ frontends — Development

**Last updated:** 2026-10-01  
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

## Provider client fetch lifecycle

List/report pages that refetch on filters, visibility, or poll must use the shared hooks — do **not** embed per-page `AbortController` / seq / soft-load blocks.

| Hook | Role |
|------|------|
| `useCancellableLoad` | `run(executor, { mode })` with `hard` \| `soft` \| `silent`; pass `signal` into `api.get` / `api.post`; exports `loading` + `painted` |
| `useAbortableRequest` | Low-level ticket API (prefer `useCancellableLoad` in pages) |
| `useTabVisibleRefresh` | Visibility (+ optional `intervalMs`) silent refresh — only after first paint |

Mode rules:

- `hard` on first empty load (owns the full-page spinner until success or a real error).
- `soft` after data has painted (filter changes); `silent` for poll/visibility.
- Soft/silent **must not** clear the hard spinner or flash an empty list when they supersede an in-flight hard load. Aborted/superseded tickets are no-ops; keep prior `items` until the current ticket settles.
- Empty copy only when `!loading && painted && items.length === 0`.
- Coalesce filter-triggered fetches (~75ms) so Strict Mode / rapid dep churn does not thrash.
- Ignore abort errors in UI toasts. Unmount aborts in-flight work.

Canceled Network rows are expected when a newer fetch supersedes an older one; that is not an API failure.
