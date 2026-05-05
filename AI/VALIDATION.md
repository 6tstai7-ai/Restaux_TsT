# Validation

## Before Coding

You must:

1. Read existing code.
2. Run `pnpm test` and report whether the baseline passes.
3. Identify impacted files.
4. Write the work plan.
5. Add the test plan directly after the work plan.
6. List risks, edge cases, expected behavior, and failure cases using `AI/TESTS.md`.

## After Coding

You must confirm:

- The focused validation command passed or failed.
- TypeScript still passes for impacted packages.
- UI still has loading, empty, and error states where relevant.
- No obvious console or API errors were introduced.
- No unused code was added.
- No secrets or generated local artifacts were committed.

## Manual Test Steps

When behavior changes, provide manual steps for the relevant flow:

- Login and protected route access.
- Customer enrollment and consent logging.
- Audit answer and promo generation.
- Promotion send.
- Visit registration and points balance.
- Redemption and points balance.
- Wallet pass generation.

## If Unsure

Say it clearly. Do not claim a real integration works unless it was verified with the necessary environment variables and external service credentials.
