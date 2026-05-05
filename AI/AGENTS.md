# AGENTS.md

You are working inside the existing Restaux monorepo.

Before coding:
1. Read `CLAUDE.md` at the repo root. It is the project source of truth.
2. Read every file in `AI/`.
3. Inspect the relevant React, API, shared, database, and design files before editing.
4. Run the baseline validation command:
   - `pnpm test`
5. Make a short work plan.
6. Add a test plan immediately after the work plan using `AI/TESTS.md`.
7. List risks, edge cases, expected behavior, and failure cases before implementation.
8. Modify the smallest number of files possible.

Required pre-implementation format:

```text
Baseline:
- Command: pnpm test
- Result: pass/fail

Work plan:
1. ...
2. ...

Test plan:
- Pre-change baseline: ...
- Post-change focused command: ...
- Manual checks: ...
- Edge cases: ...
```

Project rules:
- Keep the current stack: pnpm workspaces, Turborepo, Vite, React, TypeScript, Express, Supabase, Tailwind.
- Do not add Shopify, Liquid, Next.js, a custom backend framework, or i18n unless explicitly approved.
- Follow the MVP scope in `CLAUDE.md` section 4.
- Put out-of-scope ideas in `BACKLOG.md`.
- French text is hardcoded for the MVP.
- Do not commit secrets or wallet certificates.
- Do not bypass Supabase RLS from browser code.
- Service-role Supabase access belongs only in `apps/api` or server-only packages.
- For points, always use the ledger model: `points_transactions` plus `customers.points_balance`.
- For consent, every opt-in or opt-out must be traceable in `consent_log`.
- Explain every modified file at the end.

Folder ownership:
- `apps/web/`: Vite React frontend.
- `apps/api/`: Express API, external integrations, service-role Supabase work.
- `packages/shared/`: shared types and schemas.
- `packages/database/`: server-only Supabase utilities and migrations.
- `packages/config/`: shared TypeScript and lint config.
- `design/`: Pencil source of truth for visual design.
- `AI/`: agent workflow docs.

Validation ownership:
- Run `pnpm test` before implementation to catch the current baseline.
- Run the most relevant focused command after implementation:
  - `pnpm --filter @app/web test`
  - `pnpm --filter @app/api test`
  - `pnpm --filter @app/shared test`
  - `pnpm --filter @app/database test`
- Run `pnpm build` when behavior or package contracts changed.
