---
name: mealhq-ui-screen
description: >-
  Build or change MealHQ UI screens in Zorvia. Read FE INDEX and design guidelines,
  implement with existing patterns, then build + browser verify before Done.
---

# MealHQ UI screen

## Steps

1. Read [docs/INDEX.md](../../../docs/INDEX.md) and the relevant FE journey section.
2. For product/API rules, open sibling **mealhq-api** `docs/` (API wins on conflict).
3. Follow [design_guidelines.json](../../../design_guidelines.json). Preserve `data-testid`.
4. Implement with existing components; no Phase 2 inbox / WhatsApp chat UI.
5. Verify per [docs/TESTING.md](../../../docs/TESTING.md): **build** + **browser**.
6. Update FE docs if UI behavior/copy changes. If API contract changes, update mealhq-api docs in the same change set.

## Billing UI reminder

Gate flat billing on both `monthly_flat` and `cycle_flat`.

## Completion

```
Test tier:
Build: <command> pass/fail
Browser: <URL> what checked pass/fail
Docs updated:
```
