# FE architecture (short)

Detail: [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md), sibling `mealhq-api/ai-context/architecture.md`.

## Apps

```text
Zorvia-main/
  frontend/          Provider + consumer (App Router) → :3000
  admin-frontend/    Platform admin → :3001
```

No Mongo in this repo. No `backend/` folder — API is sibling **mealhq-api**.

## API bridge

- Next rewrites `/api` → `BACKEND_URL` or `http://127.0.0.1:8000`
- Production target: `https://api2.mealhq.ca`
- Product/API truth: mealhq-api docs win on conflict

## UI constitution

`design_guidelines.json` — preserve `data-testid` on interactive controls.
