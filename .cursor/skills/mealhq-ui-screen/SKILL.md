---
name: mealhq-ui-screen
description: >-
  Build or change MealHQ UI screens in Zorvia. Read FE INDEX and design guidelines,
  implement with existing patterns, then build + browser verify before Done.
---

# MealHQ UI screen

## Absolute roots

- FE: `/Users/ravatrajsinhchauhan/Documents/Programs/MINE/Zorvia-main`
- API: `/Users/ravatrajsinhchauhan/Documents/Programs/MINE/mealhq-api`
- Workspace: `/Users/ravatrajsinhchauhan/Documents/Programs/MINE/MealHQ.code-workspace`

## Steps

1. Read `ai-context/` then [docs/INDEX.md](../../../docs/INDEX.md) and the relevant FE journey section.
2. For product/API rules, open sibling **mealhq-api** `ai-context/` + `docs/` (API wins on conflict).
3. Follow [design_guidelines.json](../../../design_guidelines.json). Preserve `data-testid`.
4. Implement with existing components; no Phase 2 inbox / WhatsApp chat UI.
5. Verify per [docs/TESTING.md](../../../docs/TESTING.md):
   - Start local FE (+ API if needed) — do not skip with “servers down”
   - API-first when an endpoint exists
   - One Browser MCP smoke (≤5 calls) on the focus URL; `browser_close_tab`
   - Production **build** for the touched app **after** UI QA
6. Update FE docs if UI behavior/copy changes. If API contract changes, update mealhq-api docs in the same change set.
7. Context sync: sibling `mealhq-api/.cursor/skills/mealhq-context-sync/SKILL.md`.

## Billing UI reminder

Gate flat billing on both `monthly_flat` and `cycle_flat`.

## Completion

```
Test tier:
Build: <command> pass/fail
Browser MCP: Pass|Fail|Skipped — <URL> — <assert>
Docs updated:
Context sync: PMB written | graph fast|moderate|skipped | …
```
