# MealHQ frontends — Testing

**Last updated:** 2026-09-20  
Skill: [`.cursor/skills/mealhq-ui-screen/SKILL.md`](../.cursor/skills/mealhq-ui-screen/SKILL.md).

## Hard rules

1. **Local-only testing (strict, from 2026-09-20):** Browser and API verification use **localhost only** (`http://localhost:3000` / `:3001` + local API `:8000`). Do **not** open `https://www.mealhq.ca`, `admin.mealhq.ca`, or `api2.mealhq.ca` for QA unless the user **explicitly** asks in that message.
2. Build + browser gates below still apply for UI work.

## Gates before Done (UI work)

| Gate | Requirement |
|------|-------------|
| **Build** | Production build for the touched app (`frontend/` and/or `admin-frontend/`) — same path as Vercel |
| **Browser** | Browser MCP (or cursor-ide-browser): navigate, exercise primary path, report URL + pass/fail |
| **data-testid** | Preserve existing test ids |
| **API Critical** | If contract/billing/tenancy: sibling API running + mealhq-api `docs/TESTING.md` Critical |

## Production browser account

Prod UI (`https://www.mealhq.ca`): use **only** `ravatrajsinh@gmail.com`. Password in sibling gitignored `mealhq-api/memory/test_credentials.md`. Rule: [`.cursor/rules/prod-web-test-account.mdc`](../.cursor/rules/prod-web-test-account.mdc). **Never** touch any other provider/tenant.

## How to build

```bash
cd Zorvia-main/frontend && npm run build
# and/or
cd Zorvia-main/admin-frontend && npm run build
```

Use the package manager already in the app (`npm` / `pnpm` as configured).

## Tiers (shared names with API)

| Tier | FE minimum |
|------|------------|
| Smoke | Page loads; one control path |
| Standard | Form/list happy path + build |
| Critical | Full UI path + API; billing flat gates (`monthly_flat` and `cycle_flat`) |
| Regression | Build both apps if shared components changed |

## Completion

Report: tier, what was checked, build command pass/fail, browser URL + result. Close browser session tabs when finished.
