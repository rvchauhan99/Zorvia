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
| `useQueryLoad` | `run(executor, { mode, key })` with `hard` \| `soft` \| `silent`; pass `signal` into `api.get` / `api.post`; exports `loading` + `painted` + `isInFlight`. Concurrent runs with the same `key` share one in-flight request; a new run never aborts an older one — the newest result wins and stale responses are ignored when they land |
| `useTabVisibleRefresh` | Visibility (+ optional `intervalMs`) silent refresh — only after first paint; pass `isBusy` to skip ticks while a request is in flight |

Mode rules:

- `hard` on first empty load (owns the full-page spinner until success or a real error).
- `soft` after data has painted (filter changes); `silent` for poll/visibility.
- Soft/silent **must not** clear the hard spinner or flash an empty list when they overlap an in-flight hard load. Superseded results are no-ops; keep prior `items` until the current request settles.
- Empty copy only when `!loading && painted && items.length === 0`.
- Coalesce filter-triggered fetches (~75ms) so Strict Mode / rapid dep churn does not thrash.
- Ignore abort errors in UI toasts. Requests are aborted only on unmount (page leave) — never to supersede each other.
- Give every `run` a `key` built from its exact request params so identical in-flight loads dedupe into one network call (e.g. a filter effect and a tab refresh firing together).

A newer request does **not** cancel the ones before it: DevTools must show no red "canceled" rows while switching filters, marking rows, tabbing away and back, or polling. Superseded responses are discarded client-side when they arrive. If a mutation landed while a list request was in flight, do not let that stale response clobber optimistic row updates (see the `mutationEpoch` guard on the Deliveries page).
