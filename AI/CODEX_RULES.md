# Codex Rules

For every implementation task:

1. Read `CLAUDE.md` and relevant `AI/` docs.
2. Inspect existing code before deciding.
3. Run `pnpm test` before editing and report the baseline.
4. Write a short work plan.
5. Immediately after the work plan, write a test plan using `AI/TESTS.md`:
   - risks
   - edge cases
   - expected behavior
   - failure cases
6. Identify impacted frontend, API, shared, database, config, design, and docs files.
7. Make the smallest useful change.
8. Validate with focused commands after editing.
9. Update `AI/DEBUG_LOG.md` when behavior, architecture, or workflow changes.
10. Return:
   - what changed
   - files modified
   - tests run
   - risks or TODOs

Never:

- Add features outside `CLAUDE.md` section 4 without approval.
- Add i18n, Stripe, POS integrations, inventory modeling, or multi-location work for the MVP.
- Add a dependency without clear justification.
- Import `packages/database` into browser code.
- Use the Supabase service-role key in frontend code.
- Change points without a `points_transactions` record.
- Change opt-in or opt-out state without a `consent_log` record.
- Rely on CORS as authorization.
- Commit secrets, certificates, or generated local artifacts.
- Rewrite large areas when a focused patch works.
