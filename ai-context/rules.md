# FE durable rules (short)

Detail: [AGENTS.md](../AGENTS.md), [docs/INDEX.md](../docs/INDEX.md), sibling `mealhq-api/ai-context/rules.md`.

1. Preserve `data-testid`; prefer TypeScript in `frontend/`.
2. Follow `design_guidelines.json` — do not invent a second visual system.
3. Flat billing UI: gate on **both** `monthly_flat` and `cycle_flat`.
4. Do not invent Phase 2 inbox / WhatsApp chat UI unless asked.
5. No Vercel deploy / git commit / PR unless the user explicitly asks.
6. Never commit secrets; no `backend/` folder here.
7. UI Done = build + Browser MCP (≤5 calls) on the focus URL; start local servers if down.
8. Client seeds / kitchen handbooks / one-off QA → `.gitignore` + `.dockerignore` same change.
9. Open product via `MINE/MealHQ.code-workspace` (API + Web).
