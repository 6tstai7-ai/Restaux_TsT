# Tests

Testing is required before implementation and after implementation.

## Baseline Before Coding

Run:

```bash
pnpm test
```

Current meaning:
- `pnpm test` runs package `test` scripts through Turborepo.
- Package `test` scripts currently delegate to TypeScript typechecks.
- This is a baseline gate, not full behavioral coverage.

If `pnpm test` fails before editing:
- Stop and report the existing failure.
- Do not mix unrelated baseline fixes with the requested feature unless needed.

## Pre-Implementation Test Analysis

Before changing code, write a work plan, then add a test plan directly underneath it.

Minimum format:

```text
Work plan:
1. Inspect ...
2. Change ...
3. Validate ...

Test plan:
- Baseline command: pnpm test
- Focused post-change command: ...
- Manual checks: ...
- Edge cases: ...
- Regression checks: ...
```

The test plan must cover:

- What can break.
- Edge cases.
- Expected behavior.
- Failure cases.
- Existing behavior that must not regress.
- Which command proves the current baseline.
- Which command will be run after the change.

## Functional Checks

Ask:

- Does the feature work as expected?
- Does it handle empty data?
- Does it handle loading state?
- Does it handle API or Supabase errors?
- Does it handle invalid input?
- Does it preserve authorization boundaries?

## UI Checks

Ask:

- Is it responsive on mobile and desktop?
- Is there overflow?
- Are loading, empty, and error states clear?
- Does text fit in buttons, tables, cards, and forms?
- Does it stay consistent with `DESIGN.md` and `design/design-system.pen`?

## Data And Compliance Checks

Ask:

- Are null and undefined values handled?
- Are Supabase errors surfaced?
- Are service-role routes protected?
- Are RLS assumptions preserved?
- Does each opt-in or opt-out write `consent_log`?
- Does every points change write `points_transactions`?
- Are visit and redemption changes atomic?

## Critical Commands

Use the narrowest useful command:

```bash
pnpm test
pnpm typecheck
pnpm --filter @app/web test
pnpm --filter @app/api test
pnpm --filter @app/shared test
pnpm --filter @app/database test
pnpm build
```

Run `pnpm build` when a change affects build output, package contracts, deployment, or shared configuration.
