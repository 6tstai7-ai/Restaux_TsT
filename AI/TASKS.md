# Tasks

## Current Priority

- [ ] Correct stale project guidance so all AI docs match Restaux.
- [ ] Keep `pnpm test` as a real baseline command for agents before implementation.
- [ ] Require every implementation task to include a work plan followed by a test plan before code changes.
- [ ] Verify API routes that use the Supabase service-role key have proper authorization.
- [ ] Make dashboard customer creation record explicit consent in `consent_log`.
- [ ] Confirm public enrollment customer insert and consent log behavior is safe enough for pilot.
- [ ] Verify promo generation and SMS send flows against real Supabase/Twilio config.
- [ ] Verify wallet pass generation with real Apple Wallet credentials.
- [ ] Validate mobile layout for dashboard, customers, scanner, loyalty settings, and public enrollment.

## Critical Path

- [ ] Authenticated owner can access dashboard.
- [ ] Owner can create or find the pilot restaurant.
- [ ] Customer can be enrolled with SMS consent.
- [ ] Audit response creates a draft promotion through Anthropic.
- [ ] Promotion can be sent to opted-in customers.
- [ ] Visit registration creates a visit and points transaction atomically.
- [ ] Redemption creates a negative points transaction atomically.
- [ ] Wallet pass can be generated and downloaded.

## Backlog

- [ ] Real test suite beyond typecheck.
- [ ] Generated Supabase TypeScript types.
- [ ] API route tests.
- [ ] UI smoke tests.
- [ ] Sentry wiring.
- [ ] Google Wallet support.
- [ ] Email via Resend.
