# TEST_GLOBALV1 — Restaux1

## Goal
Document what the app can and cannot do at this stage.

## Global baseline
- Date: 2026-05-04
- Branch/state if available: `master`; working tree is dirty with existing modified and untracked app/test/docs files.
- `pnpm test` result: pass.
- Baseline summary: Turborepo reported `Tasks: 4 successful, 4 total`; shared, database, API, and web tests passed from cache.
- Known warnings:
  - API public enrollment test logs the expected consent rollback failure path: `[api] consent_log insert échoué: consent insert failed`.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.
  - Prior debug log entries show recurring Turbo warnings about configured test outputs such as `coverage/**` not being produced; this baseline run did not emit that warning.

## Test methodology
Testing will be done module by module. Each module pass should combine code inspection, existing automated test review, targeted command execution when useful, and manual/live validation only when the needed environment and credentials are available. This document records current capability, known gaps, and the next required action without implementing new features or changing app logic.

## Module checklist

### Module: Auth/session

#### Status
- Tested (revalidated 2026-05-05, current pass)

#### What was tested
- Read `AI/AGENTS.md`, `AI/CODEX_RULES.md`, `AI/TESTS.md`, `AI/VALIDATION.md`, `AI/DEBUG_LOG.md`, and `CLAUDE.md`.
- Ran baseline `pnpm test`.
- Inspected web session setup in `apps/web/src/lib/supabase.ts`.
- Inspected session hook in `apps/web/src/hooks/useSession.ts`.
- Inspected private-route gate in `apps/web/src/components/ProtectedRoute.tsx`.
- Inspected login flow in `apps/web/src/pages/Login.tsx`.
- Inspected route protection in `apps/web/src/App.tsx`.
- Inspected token usage in `apps/web/src/DemoDashboard.tsx`, `apps/web/src/pages/StockPage.tsx`, `apps/web/src/components/ClientsView.tsx`, `apps/web/src/components/LoyaltySettings.tsx`, and `apps/web/src/components/ScannerView.tsx`.
- Inspected API auth helpers in `apps/api/src/auth.ts`.
- Inspected API routes in `apps/api/src/server.ts`, `apps/api/src/inventory.ts`, and `apps/api/src/wallet.ts`.
- Reviewed auth-related tests in `apps/api/src/auth.test.ts`, plus inventory and wallet tests that cover missing bearer tokens and owner checks.

#### What works
- The web Supabase client requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at startup.
- Browser auth is configured with persistent sessions, token auto-refresh, and URL session detection.
- `useSession()` loads the current Supabase session with `supabase.auth.getSession()` and updates local state through `onAuthStateChange`.
- `/login` uses `supabase.auth.signInWithPassword()` and redirects authenticated users to `/dashboard`.
- Private web pages are wrapped in `ProtectedRoute`: `/dashboard`, `/stock`, `/customers`, `/loyalty`, and `/scanner`.
- Missing browser session redirects protected pages to `/login` after the loading state.
- `/rejoindre/:restaurantId` and `/login` are intentionally public routes.
- Dashboard, Stock, Clients wallet generation, inventory, promotion generation, and promotion send API calls include `Authorization: Bearer ${session.access_token}` when a token exists.
- Direct browser Supabase reads/writes use the active Supabase client session and rely on Supabase RLS for restaurant-scoped data.
- API `requireUserId()` rejects missing bearer tokens with `401` and does not call Supabase Auth when the header is absent.
- API `requireUserId()` validates bearer tokens via `supabase.auth.getUser(token)` and rejects invalid sessions with `401`.
- API `requireRestaurantOwner()` checks `restaurants.owner_id` before allowing restaurant-scoped service-role operations.
- Inventory, promo generation, promo send, and authenticated wallet generation use the API auth helpers.
- Existing API tests cover bearer token extraction, missing-token rejection, valid-token user id lookup, owner access, and non-owner rejection.
- Existing inventory and wallet tests also cover unauthenticated API requests being rejected before protected table work.

#### What does not work / limitations
- There are no web component tests for `useSession()`, `ProtectedRoute`, or `Login`.
- There is no automated browser/e2e test proving unauthenticated users are redirected from each protected page.
- There is no live expired-session test proving the UI recovers cleanly after Supabase refresh failure or an API `session invalide` response.
- There is no visible logout/sign-out control in the inspected UI.
- `useSession()` does not expose an auth error state if `getSession()` fails.
- Login shows raw Supabase error messages rather than normalized French product copy.
- Some modules rely on direct browser Supabase access; authorization depends on live RLS policies being present and correct.
- `GET /api/wallet/apple/:clientId` is public and can generate a pass by client id without owner authentication. This may be intentional for wallet delivery, but it is not documented here as an explicit public capability.
- API auth tests use mocked Supabase clients; they do not prove live Supabase Auth or RLS behavior.

#### Bugs found
- No confirmed functional auth/session bug from this pass.
- Potential security/design issue: unauthenticated Apple pass generation by `clientId` should be explicitly accepted, constrained, or redesigned before production.

#### Risks
- Missing web-route auth tests could allow regressions in protected routing.
- Missing live Auth/RLS smoke tests could hide deployment-level access control issues.
- A public wallet pass URL keyed only by client id may expose loyalty pass data if ids leak.
- Raw Supabase login errors and existing mojibake in some French strings reduce polish and may confuse users.
- Direct browser Supabase writes must remain covered by RLS; any missing policy would become a data isolation risk.

#### Next required action
- Add focused web tests for `ProtectedRoute`, `/login` redirect behavior, and login error/success states.
- Run a live auth smoke test with a real Supabase user: unauthenticated protected-route redirect, valid login, token-authenticated API call, invalid/expired token rejection, and non-owner restaurant access rejection.

### Module: Dashboard

#### Status
- Tested

#### What was tested
- Ran current baseline `pnpm test`.
- Inspected dashboard route protection in `apps/web/src/App.tsx`.
- Inspected dashboard implementation in `apps/web/src/DemoDashboard.tsx`.
- Inspected dashboard decision logic in `apps/web/src/lib/dashboardDecision.ts`.
- Reviewed dashboard decision tests in `apps/web/src/lib/dashboardDecision.test.ts`.
- Inspected shared dashboard navigation in `apps/web/src/components/DashboardNav.tsx`.
- Inspected shared UI primitives used by the dashboard in `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/badge.tsx`, and `apps/web/src/components/ui/card.tsx`.
- Searched web/API code for dashboard promo generation, promo send, SMS opt-in KPI, quick actions, Stock links, and related tests.

#### What works
- `/dashboard` is wrapped in `ProtectedRoute`, so unauthenticated users should be redirected to `/login` after session loading.
- The dashboard uses a mobile-first single-column layout with constrained width and responsive two-column sections at `md`.
- The top dashboard quick actions include links to `/dashboard`, `/stock`, `/customers`, `/scanner`, and `/loyalty`.
- Stock integration is present in the dashboard quick actions through a visible `Stock` link with a package icon.
- `DashboardNav` also contains a `Stock` link for shared navigation on pages that render it.
- The "Aujourd'hui" decision section is driven by `deriveDashboardDecision()`.
- Existing decision tests cover no restaurant, zero customers, campaign-ready default state, generated campaign waiting to send, sent campaign success, and degraded metrics-error state.
- Dashboard metrics load from the authenticated owner's first restaurant.
- KPI cards show total customers, SMS opt-in count, and total points.
- SMS opt-in KPI counts customers with `opt_in_sms = true`.
- Loading states exist for the "Aujourd'hui" decision card, KPI values, and recent customer rows.
- Empty states exist for no generated promo and no recent customers.
- Metrics error states exist: "Aujourd'hui" becomes a retry state, KPI values show a dash, recent customers show an unavailable message, and a retry block appears.
- The Recommendation IA card has a generate CTA, generated-message state, send CTA, view-message CTA, sent badge, and expected impact copy.
- Promo generation inserts or creates the owner restaurant, inserts an `audits` row with the hardcoded surplus response, then calls `POST /api/generate-promo` with a bearer token.
- SMS send flow is present after generation and calls `POST /api/promotions/:id/send` with a bearer token.
- SMS preview card shows either an empty state or the generated SMS, and shows sent/error feedback for the send flow.
- Promo generation errors are now rendered in the Recommendation IA card as a friendly French alert without exposing raw technical details.
- Visual identity is scoped in `DemoDashboard` to blue tenant accents and blue warning; critical/send-error states use red danger styling.

#### What does not work / limitations
- There is no rendered dashboard component test for the actual React UI.
- There is no e2e/browser test for `/dashboard` route protection, navigation clicks, responsive layout, promo generation, or send flow.
- Dashboard metrics are loaded through direct browser Supabase queries, so live behavior depends on correct Supabase session/RLS configuration.
- The dashboard uses only the first restaurant owned by the user; multi-restaurant selection is not implemented.
- The dashboard does not load an existing draft promotion from the database on page load; generated SMS state exists only for the current browser session unless another flow sets it.
- The audit response is still a hardcoded demo surplus string rather than a user-entered dashboard audit response.
- The profile icon button has no visible action.
- No logout control is visible on the dashboard.
- Promo generation and send API endpoints are not covered by dedicated automated tests in this dashboard pass.
- The dashboard was not rendered in a real browser or screenshot harness, so mobile text fit and visual spacing were assessed from code only.
- Several visible French strings in the inspected dashboard source still show encoding damage in the workspace display, such as `Ã`, `â€¦`, and `Â·`.

#### Bugs found
- Fixed after audit: promo generation errors previously used `setAuditError(...)` without rendering `auditError`. `apps/web/src/DemoDashboard.tsx` now displays a calm, user-safe Recommendation IA alert.

#### Risks
- Missing rendered UI tests could allow regressions in the dashboard composition, CTA visibility, or route behavior.
- Missing live tests could hide Supabase RLS, Auth, Anthropic, or Twilio failures.
- The hardcoded surplus response can make the dashboard look functional while bypassing the real chef-input workflow described in `CLAUDE.md`.
- Creating a restaurant during promo generation is convenient for demo setup but may hide missing onboarding/configuration states.
- Long generated SMS or customer fields may still need browser validation for wrapping and mobile fit.
- Existing mojibake can reduce user trust and should be audited before pilot demo.
- Blue/red visual consistency is good from code inspection, but no rendered visual QA was run in this pass.

#### Next required action
- Add focused dashboard UI tests for loading, empty, metrics-error, generated-message, send-error, and sent states.
- Run a live dashboard smoke test with a real owner session: protected route, metrics load, zero-customer state, generate promo, send promo, retry metrics, and Stock quick-action navigation.

### Module: Stock

#### Status
- Tested (revalidated 2026-05-05, current pass)

#### What was tested
- Ran current baseline `pnpm test`.
- Inspected protected `/stock` route registration in `apps/web/src/App.tsx`.
- Inspected shared navigation and Stock link exposure in `apps/web/src/components/DashboardNav.tsx`.
- Inspected dashboard quick-action Stock link exposure in `apps/web/src/DemoDashboard.tsx`.
- Inspected Stock UI implementation in `apps/web/src/pages/StockPage.tsx`.
- Reviewed Stock UI/helper tests in `apps/web/src/pages/StockPage.test.ts`.
- Inspected inventory route registration in `apps/api/src/server.ts`.
- Inspected API inventory controllers in `apps/api/src/inventory.ts`.
- Reviewed API inventory tests in `apps/api/src/inventory.test.ts`.
- Inspected shared inventory alert logic in `packages/shared/src/inventory.ts`.
- Reviewed shared inventory alert tests in `packages/shared/src/inventory.test.ts`.
- Reviewed static weekly inventory migration/RLS checks in `packages/database/src/index.test.ts`.
- Reviewed `AI/DEBUG_LOG.md` for prior live Supabase stock smoke results and known deployment/schema blockers.
- Searched for the removed visible `Cible` field and confirmed it is not rendered in the current Stock page.

#### What works
- `/stock` is protected by `ProtectedRoute`.
- Stock is reachable from dashboard quick actions and shared `DashboardNav`.
- The Stock page loads the authenticated owner's first restaurant through the browser Supabase client.
- The page fetches the current-week inventory check with `GET /api/inventory/checks/current-week` using bearer auth and the computed Monday `week_start_date`.
- If no current-week check exists, the UI starts with one empty editable line.
- If a draft exists, saved lines are mapped back into editable form state, the page keeps draft actions available, and the success state says the draft was resumed.
- Editing any line resets save/completion/campaign transient states so draft modifications are treated as unsaved work.
- If a completed check exists, saved lines and persisted alerts are loaded, the badge shows completed state, and line inputs, add/remove, save, and complete actions are disabled.
- The form supports product name, quantity, optional minimum, optional expiry date, and condition/state (`OK`, watch, bad).
- The visible `Cible` field is absent from the Stock form and `buildInventoryLinesPayload()` does not send `target_quantity` from current form input.
- Users can add lines and remove lines, while preserving at least one line.
- Client-side validation blocks empty product names, invalid quantities, and invalid minimum values.
- Draft save calls `PUT /api/inventory/checks/current-week/draft` with bearer auth.
- Completion creates/saves a draft first when needed, then calls `POST /api/inventory/checks/:id/complete` with bearer auth and current form lines.
- Completion derives/persists alerts server-side and returns alert results for the UI.
- Alert groups render separately for critical, reorder, sell quickly, and surplus.
- Empty, loading, success, restaurant error, validation/API error, and completed read-only states exist in code.
- The stock-to-promo CTA is present in the Alertes section and is disabled until the check is completed and the alerts include `sell_quickly` or `surplus`.
- Stock campaign creation status, generated SMS display, promotion id display, and error display are present in code; the deeper stock-to-promo flow is tracked as its own module.
- Web tests cover week start calculation, form validation, API payload shaping, alert grouping, stock campaign eligibility, loaded draft mapping, and completed-check mapping.
- API tests cover unauthenticated draft rejection, invalid payload rejection, current-week draft load, completed check load with alerts, create/update draft line replacement, completion with derived persisted alerts, non-owner completion rejection, and stock-promo audit creation/reuse.
- Shared tests cover low stock, out of stock, expiring soon, surplus, surplus from minimum fallback, bad condition, priority sorting, no-alert healthy state, and empty input.
- Database tests statically verify inventory tables, restaurant scoping, weekly uniqueness, draft/completed status, alert type/severity constraints, alert snapshots, and owner-style RLS policies in the migration.
- Visual identity is black + blue for normal/attention stock UI, with red used for critical/error states.
- Current validation passes: `pnpm test` reported `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 21 tests passed from cache.

#### What does not work / limitations
- There is no rendered Stock page component test or browser/e2e test.
- No browser screenshot/device QA was run in this pass, so actual mobile layout, responsive navigation, date input behavior, long product/alert wrapping, disabled-state affordance, and overflow are code-inspected only.
- The Stock page uses the first restaurant owned by the session; multi-restaurant selection is not implemented.
- The page depends on browser Supabase queries plus live RLS for restaurant discovery.
- API inventory tests use mocked Supabase builders; they do not prove live Supabase Auth, RLS, composite foreign keys, or PostgREST schema behavior.
- The API write path is sequenced but not a true database transaction; draft line/item writes may partially complete before a later failure.
- Completed checks are read-only in the UI; reopening/correcting a completed check or making a new revision is not implemented.
- The visible form no longer edits `target_quantity`, while API/shared code still supports target quantity for persisted/historical lines; new surplus detection therefore depends on explicit historical targets or the simple `minQuantity * 2` fallback.
- The UI simplification without visible `Cible` is present in the current Stock form and web payload helper, but there is no rendered/browser test proving the field is absent in the actual DOM.
- Stock UI shows backend error strings in several places, so some technical messages may leak into the product experience.
- Stock helper tests exercise pure functions only; they do not click add/remove/save/complete buttons in a rendered React component.
- The stock-to-promo CTA is present, but no rendered/e2e test proves its enabled/disabled DOM state or generated-campaign display.
- The live Supabase stock flow has previously been blocked by schema drift from the repo migration, especially missing `inventory_check_lines` columns such as `inventory_check_id` and `min_quantity_snapshot`.
- No current evidence in this pass confirms the live Supabase schema now matches `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql`.

#### Bugs found
- No new application-code bug confirmed in this pass.
- Existing deployment/schema blocker remains documented from prior live smoke tests: live Supabase inventory schema has not been proven aligned with the repo/API expectations.

#### Risks
- Live stock save/complete may fail until Supabase schema and PostgREST cache match the repo migration.
- Lack of transactional API writes can leave partial draft/item data if a later line or alert operation fails.
- Missing rendered UI tests can hide regressions in completed locking, mobile navigation, long alert text, and generated SMS/promotion id wrapping.
- The derived surplus rule is intentionally simple and may create false positives/negatives for real restaurant inventory.
- Owner access is covered with mocked tests and migration text checks, but live owner/non-owner RLS behavior still needs verification.
- Stock inventory is broader than the original `CLAUDE.md` MVP warning against inventory modeling; it exists now, but product scope should stay disciplined.

#### Next required action
- Run a live Supabase Stock smoke after confirming schema alignment: no check, save draft, reload draft, complete check, reload completed alerts, reject non-owner access.
- Add rendered web tests for Stock loading, no-check empty form, draft loaded form, completed read-only state, validation/API errors, alert groups, and CTA enablement.
- Add or document a reliable migration command/process so the live Supabase schema stays aligned with the repo migration.

### Module: Stock-to-promo

#### Status
- Tested (revalidated 2026-05-05, current pass)

#### What was tested
- Ran current baseline `pnpm test`.
- Inspected Stock campaign eligibility and UI flow in `apps/web/src/pages/StockPage.tsx`.
- Reviewed Stock helper tests in `apps/web/src/pages/StockPage.test.ts`.
- Inspected stock promo audit controller in `apps/api/src/inventory.ts`.
- Inspected stock audit response builder and stock audit marker/idempotency helpers in `apps/api/src/inventory.ts`.
- Reviewed stock promo audit tests in `apps/api/src/inventory.test.ts`.
- Inspected existing promo generation endpoint in `apps/api/src/server.ts`.
- Inspected existing promotion send endpoint in `apps/api/src/server.ts` to understand where stock-generated drafts can be sent.
- Searched current code/tests for stock-promo marker, CTA gating, existing draft reuse, empty/non-marketable alert handling, and live smoke notes.
- Reviewed prior `AI/DEBUG_LOG.md` live smoke notes for stock-to-promo draft generation and remaining send/idempotency risks.

#### What works
- Stock campaign creation is only enabled in the UI after a completed check has an inventory check id and at least one marketable alert: `sell_quickly` or `surplus`.
- Reorder-only and critical-only stock alerts do not enable the Stock campaign CTA.
- The UI calls `POST /api/inventory/checks/:id/stock-promo-audit` with a bearer token.
- The stock promo audit endpoint requires an authenticated user.
- The endpoint loads the inventory check, verifies restaurant ownership, and rejects incomplete checks.
- The endpoint loads persisted completed-check alerts from `inventory_alerts` and builds an audit response only when marketable stock opportunities exist.
- `sell_quickly` and `surplus` alerts are prioritized as campaign candidates.
- Critical/reorder alerts are used as operational context only when they are separate from the marketable items.
- If no campaign-worthy alerts exist, the endpoint rejects audit creation instead of creating a useless campaign.
- The endpoint stores a deterministic marker in the audit response: `stock-promo:inventory-check:<inventory_check_id>`.
- Before inserting a new audit, the endpoint searches for an existing stock audit with the same marker.
- If an existing stock audit has a draft promotion, the endpoint returns that promotion id and SMS instead of inserting a duplicate audit.
- If there is no existing draft promotion, the Stock page calls the existing `POST /api/generate-promo` endpoint with the returned `audit_id`.
- Existing `/api/generate-promo` verifies auth, loads the audit, checks restaurant ownership, calls Anthropic, and inserts a draft promotion.
- Stock page displays the generated SMS and promotion id after generation succeeds.
- The Stock CTA shows a creating label while work is in progress and stays disabled after a generated campaign exists in the current page state.
- API tests cover stock audit response priority, no-op behavior when no promo opportunity exists, audit creation from completed alerts, returning an existing stock promo draft, and rejecting incomplete checks.
- Web tests cover campaign CTA eligibility logic through `hasStockCampaignOpportunity()`.
- A prior live Supabase smoke documented in `AI/DEBUG_LOG.md` passed the stock-to-promo draft path after a schema/write fix: completed alerts -> stock audit -> `/api/generate-promo` -> promotion draft -> generated SMS returned.
- Current validation passes: `pnpm test` reported `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 21 tests passed from cache.

#### What does not work / limitations
- There is no rendered Stock-to-promo UI test or browser/e2e test.
- There is no automated test covering the full web click sequence from completed stock page to generated campaign card.
- There is no dedicated automated test for `/api/generate-promo` in this pass; the stock audit endpoint is tested, but Anthropic/promotion creation behavior is not unit-covered here.
- The generated stock campaign is displayed on `/stock`, but sending still happens through the existing dashboard promotion send path; `/stock` does not send the campaign.
- The stock-generated draft is not automatically surfaced back into the dashboard in a durable cross-page workflow in this pass.
- If a stock audit exists without a draft promotion, repeated requests can return the existing audit and then the page may call `/api/generate-promo` again for the same audit.
- Duplicate prevention is marker-based in `audits.response`, not enforced by a database unique constraint or transaction keyed by `inventory_check_id`.
- Two perfectly concurrent first-time requests could still race before either audit is visible.
- The endpoint stores internal idempotency metadata in free-text audit response because there is no dedicated stock audit metadata column.
- Errors from stock audit or promo generation can surface backend strings in the Stock UI.
- `/api/generate-promo` is implemented inline in `apps/api/src/server.ts`, which makes focused unit coverage harder than for extracted controllers.
- Live stock-to-promo depends on the underlying inventory schema being aligned. A prior stock-to-promo contract smoke passed, but later live stock smokes again documented inventory schema drift that can block completed-check/alert prerequisites.
- Promotion SMS sending from a stock-generated draft was explicitly not executed in the prior live stock-to-promo smoke.

#### Bugs found
- No new application-code bug confirmed in this pass.
- Known residual risk: duplicate draft generation may still occur for the same existing audit if no draft promotion exists yet and `/api/generate-promo` is called repeatedly.

#### Risks
- Idempotency is application-level and text-marker-based, so it is weaker than a database uniqueness guarantee.
- The flow spans Stock UI, inventory API, generic audit-to-promo API, Anthropic, and promotions table; failures can occur at several boundaries without a single transaction.
- Generated SMS quality and safety depend on the prompt and Anthropic response; this pass did not inspect live model output.
- Stock-generated campaigns may confuse operators if they expect to send directly from `/stock`.
- Live schema drift can still block the upstream completed-check/alert prerequisites.
- Without browser tests, CTA disabled/enabled states and generated campaign display can regress unnoticed.
- Missing route-level `/api/generate-promo` tests leave Anthropic and promotion insert failure semantics under-covered for this stock flow.

#### Next required action
- Add rendered/e2e coverage for completed Stock page -> create campaign -> generated campaign display -> repeated click/idempotency behavior.
- Add focused API coverage for `/api/generate-promo` ownership checks, Anthropic failures, empty responses, and promotion insert failures.
- Add stronger idempotency for one promotion per inventory check, ideally with a structured column or database constraint instead of a marker in `audits.response`.
- Decide whether `/stock` should support sending stock-generated campaigns directly or explicitly hand off to Dashboard.
- Rerun a live stock-to-promo smoke after confirming live inventory schema alignment, including duplicate request behavior and promotion send if product scope allows it.

### Module: Clients

#### Status
- Tested (revalidated 2026-05-05, current pass)

#### What was tested
- Ran current baseline `pnpm test`.
- Inspected protected `/customers` route registration in `apps/web/src/App.tsx`.
- Inspected dashboard client management UI in `apps/web/src/components/ClientsView.tsx`.
- Inspected consent payload helpers in `apps/web/src/lib/customerConsent.ts`.
- Reviewed consent helper tests in `apps/web/src/lib/customerConsent.test.ts`.
- Inspected public enrollment UI in `apps/web/src/views/PublicEnrollment.tsx`.
- Inspected public enrollment API controllers in `apps/api/src/public.ts`.
- Reviewed public enrollment tests in `apps/api/src/public.test.ts`.
- Inspected wallet API route wiring in `apps/api/src/server.ts`.
- Inspected authenticated dashboard pass controller in `apps/api/src/wallet.ts`.
- Reviewed wallet owner/pass generation tests in `apps/api/src/wallet.test.ts` for the client pass action.
- Searched current web/API tests for rendered Clients/Public Enrollment coverage and found only helper/API coverage.

#### What works
- `/customers` is wrapped in `ProtectedRoute`.
- The Clients page uses the active Supabase session and loads the authenticated owner's first restaurant.
- Customer listing loads `id`, `name`, `phone`, `points_balance`, and `created_at`, ordered newest first.
- Loading, empty, and error states exist for the customer list.
- Dashboard manual customer creation requires name, phone, and explicit SMS consent before submit is enabled.
- Dashboard customer creation inserts `opt_in_sms: true` and `opt_in_sms_at` through the shared consent helper.
- Dashboard customer creation attempts to insert a matching `consent_log` row with `type: sms`, `action: opt_in`, `source: dashboard_manual`, and timestamp.
- If dashboard consent logging fails, `ClientsView` now attempts to delete the just-created customer; if deletion fails, it updates the customer to `opt_in_sms: false` and `opt_in_sms_at: null`.
- Successful dashboard customer creation clears the form and reloads the customer list.
- Each listed customer has a `Generer pass` action that calls `POST /api/wallet/generate` with a bearer token and downloads a `.pkpass` file.
- `POST /api/wallet/generate` requires a bearer token and checks the authenticated user owns the customer's restaurant before generating a pass.
- Public enrollment at `/rejoindre/:restaurantId` loads public restaurant branding and renders a public signup form.
- Public enrollment requires explicit SMS consent before the submit button is enabled.
- Public enrollment submits to `POST /api/public/enroll` with restaurant id, name, phone, and `opt_in_sms`.
- Public enrollment success shows a wallet link to `/api/wallet/apple/:customerId`.
- Public enrollment API validates restaurant id format, required name/phone, and explicit SMS consent before creating a customer.
- Public enrollment API checks the restaurant exists, inserts the customer with SMS opt-in fields, logs consent with source, IP, and user-agent, and rolls back the customer if consent logging fails.
- Public enrollment API maps duplicate customer/phone errors to a `409` response.
- Dashboard consent helper tests now also cover the rollback update payload that disables SMS opt-in when consent logging cannot be completed.
- Existing tests cover dashboard consent payload shaping, dashboard consent rollback payload shaping, public consent rejection, public customer plus consent insert success, consent-log failure rollback, and authenticated wallet generation owner checks.
- Current validation passes: `pnpm test` reported `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 21 tests passed from cache.

#### What does not work / limitations
- There are no rendered component tests for `ClientsView` or `PublicEnrollment`.
- There is no browser/e2e test for the protected Clients page, manual enrollment, public enrollment, wallet download, or mobile layout.
- Dashboard manual customer creation uses direct browser Supabase writes and depends on live RLS policies.
- Dashboard manual customer creation is still frontend-driven rather than transactionally atomic, but `ClientsView` now attempts to delete the just-created customer when `consent_log` insertion fails, and falls back to disabling SMS opt-in if deletion fails.
- If both dashboard deletion and SMS opt-in neutralization fail after consent logging fails, the UI can still report rollback failure while leaving cleanup unresolved.
- Dashboard duplicate handling depends on the raw Supabase insert error; it is not normalized like the public enrollment API.
- Dashboard and public forms only validate non-empty phone values; there is no phone normalization or format validation.
- There is no client edit, delete, merge, unsubscribe, or opt-out workflow in the inspected UI.
- Email consent is not implemented in the inspected client flows.
- Dashboard pass generation is manual per customer; newly enrolled dashboard customers are not automatically offered a pass.
- Public Apple pass delivery is unauthenticated by `customerId`, which may be intentional but is not constrained by a signed or expiring token in the inspected code.
- Several user-facing errors can display raw backend/Supabase text.
- Some visible French strings in the inspected Clients/Public Enrollment source still show encoding damage in the workspace display, such as `crÃƒÂ©ÃƒÂ©`.

#### Bugs found
- Fixed after audit: dashboard manual enrollment previously left the customer inserted with `opt_in_sms: true` and `opt_in_sms_at` if the `consent_log` insert failed. `ClientsView` now rolls back the inserted customer, or neutralizes SMS opt-in if deletion fails.

#### Risks
- Consent/compliance risk is reduced by rollback/neutralization, but the flow still relies on sequential browser Supabase writes instead of a single transactional API/RPC path.
- RLS risk: dashboard customer listing and creation are direct browser Supabase operations and need live owner/non-owner validation.
- Duplicate/phone-quality risk: lack of phone normalization can create duplicate records or invalid SMS targets.
- Public pass URL risk: `/api/wallet/apple/:customerId` can expose pass generation if customer ids leak.
- Operational risk: raw technical errors and mojibake reduce trust during onboarding and public signup.
- Test risk: current coverage is helper/API focused; the real React forms and wallet download behavior are not rendered in tests.

#### Next required action
- Move dashboard manual enrollment into an API route or RPC so customer creation and consent logging happen transactionally.
- Add rendered tests for `ClientsView` list loading, empty state, SMS consent gating, insert success, insert failure, consent-log failure, and pass generation error handling.
- Add rendered/public enrollment tests for restaurant loading, invalid link, consent gating, duplicate phone, consent rollback error, success, and wallet link display.
- Run a live Supabase smoke test for dashboard customer creation, public enrollment, consent log creation, duplicate phone handling, owner/non-owner access, and wallet pass download.

### Module: Carte identité / wallet

#### Status
- Tested

#### What was tested
- Ran current baseline `pnpm test`.
- Inspected protected `/loyalty` route registration in `apps/web/src/App.tsx`.
- Inspected wallet branding UI in `apps/web/src/components/LoyaltySettings.tsx`.
- Inspected public enrollment wallet link behavior in `apps/web/src/views/PublicEnrollment.tsx`.
- Inspected Clients pass download action in `apps/web/src/components/ClientsView.tsx`.
- Inspected wallet API route registration in `apps/api/src/server.ts`.
- Inspected wallet controllers in `apps/api/src/wallet.ts`.
- Inspected Apple pass generation service in `apps/api/src/services/passkit.ts`.
- Reviewed wallet controller tests in `apps/api/src/wallet.test.ts`.
- Reviewed passkit color helper tests in `apps/api/src/services/passkit.test.ts`.
- Inspected restaurant card-branding migration in `packages/database/supabase/migrations/20260424120000_restaurants_card_branding.sql`.
- Compared Apple Wallet environment variable usage in code with `.env.example` and `apps/api/.env.example`.

#### What works
- `/loyalty` is protected by `ProtectedRoute`.
- The shared dashboard navigation exposes the wallet/card identity page as `Identité carte`.
- `LoyaltySettings` loads the authenticated owner's first restaurant through the browser Supabase client.
- The wallet settings UI can edit card background color, text color, label color, and description.
- The wallet settings UI renders a live card preview using the selected colors.
- Saving wallet settings updates the restaurant row directly through browser Supabase.
- The card-branding migration adds `card_bg_color`, `card_text_color`, `card_label_color`, and `card_description` columns with defaults.
- The wallet settings page shows a public enrollment link for `/rejoindre/:restaurantId` and can copy it to the clipboard.
- Public enrollment loads restaurant card colors/description and applies tenant colors to the signup page.
- After public enrollment succeeds, the UI shows a wallet download/add link to `/api/wallet/apple/:customerId`.
- The Clients page has a manual `Générer pass` action that calls `POST /api/wallet/generate` with a bearer token and downloads a `.pkpass` blob.
- `POST /api/wallet/generate` requires `client_id`, requires a valid Supabase bearer token, loads the customer and restaurant, checks that the authenticated user owns the restaurant, then generates a pass.
- `GET /api/wallet/apple/:clientId` validates the URL param and generates a pass by customer id without owner auth, intended for public customer wallet links.
- Apple pass generation uses `passkit-generator`, PKCS#12 certificate extraction, WWDR certificate loading, wallet assets, tenant colors, customer name, point balance, restaurant name, and a QR barcode containing the customer id.
- Pass responses set `Content-Type: application/vnd.apple.pkpass`, `Content-Disposition` with a generated filename, and `Cache-Control: no-store`.
- API tests cover missing bearer rejection for dashboard pass generation, non-owner rejection, and successful authenticated owner `.pkpass` generation with mocked `generateApplePass`.
- Passkit tests cover readable contrast color choice, shorthand hex normalization, and invalid-color fallback.
- Current validation passes: `pnpm test` reported `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.

#### What does not work / limitations
- There are no rendered component tests for `LoyaltySettings`, wallet preview, public enrollment wallet link display, or Clients pass download behavior.
- There is no browser/e2e test for `/loyalty`, color input behavior, copy public link, `.pkpass` download, public enrollment wallet link, or mobile layout.
- Wallet branding save uses direct browser Supabase writes and depends on live RLS policies.
- The wallet settings page uses the first restaurant owned by the session; multi-restaurant selection is not implemented.
- The UI accepts arbitrary text in color fields; invalid hex values can break or degrade the browser preview even though pass generation has fallback behavior for some invalid colors.
- There is no UI validation or warning for poor contrast between selected card colors.
- `name` is loaded into the wallet preview but is not editable on the wallet settings page.
- Apple pass generation with real certificates, real wallet assets, and an actual device was not executed in this pass.
- `loadCertificateEnv()` and `generateApplePass()` are not integration-tested for missing env vars, invalid PKCS#12 data, missing assets, or generated pass contents.
- `GET /api/wallet/apple/:clientId` is public and not covered by dedicated automated tests in this pass.
- Public wallet links are keyed only by raw customer id; there is no signed, expiring, or revocable token.
- Pass QR/barcode content is the raw customer id.
- Passes are generated on demand and marked `no-store`; there is no Apple Wallet web service/push update implementation to keep installed passes automatically updated.
- Google Wallet is referenced in docs/env examples but is not implemented in the inspected code.
- Several wallet/public enrollment strings still show encoding damage in the workspace display, such as `IdentitÃ©`, `fidÃ©litÃ©`, and `Chargementâ€¦`.

#### Bugs found
- Confirmed configuration/documentation bug: `apps/api/src/services/passkit.ts` reads `APPLE_WALLET_P12_BASE64`, `APPLE_WALLET_WWDR_BASE64`, and `APPLE_WALLET_PASSPHRASE`, while `.env.example` and `apps/api/.env.example` document `APPLE_WALLET_CERT_PATH`, `APPLE_WALLET_WWDR_CERT_PATH`, and `APPLE_WALLET_CERT_PASSWORD`. A deployer following the examples will not satisfy the current passkit code.

#### Risks
- Public wallet pass generation by `customerId` can expose loyalty pass data and QR ids if customer ids leak.
- Real Apple Wallet generation can fail in production if certificate, WWDR, pass type id, team id, passphrase, or image assets are missing or malformed.
- Environment example drift makes wallet deployment error-prone.
- Direct browser Supabase writes for card branding require correct live RLS.
- Missing rendered/browser tests can hide broken wallet preview styling, color input issues, mobile overflow, copy-link failures, and pass download regressions.
- Installed passes may become stale because there is no pass update/push service.
- Raw backend errors and mojibake reduce trust in wallet setup and public enrollment.

#### Next required action
- Align Apple Wallet environment documentation with the code, or update the code to match the documented env names.
- Add tests for the public Apple pass controller, passkit missing-env/missing-asset failures, and generated pass payload fields.
- Add rendered web tests for `/loyalty` loading, empty/error states, color editing, save success/failure, public link copy, and wallet preview.
- Run a live Apple Wallet smoke with real credentials/assets: authenticated owner pass download, public enrollment pass link, generated pass install/open on iPhone, QR content, colors, labels, points, and missing-certificate failure behavior.

### Module: Scanner

#### Status
- Tested

#### What was tested
- Ran current baseline `pnpm test`.
- Inspected protected `/scanner` route registration in `apps/web/src/App.tsx`.
- Inspected scanner implementation in `apps/web/src/components/ScannerView.tsx`.
- Inspected scanner navigation exposure in `apps/web/src/DemoDashboard.tsx` and `apps/web/src/components/DashboardNav.tsx`.
- Inspected dashboard decision copy that routes owners to scanner after a sent campaign in `apps/web/src/lib/dashboardDecision.ts`.
- Inspected visit/redemption RPC migration in `packages/database/supabase/migrations/20260426120000_visit_redemption_rpcs.sql`.
- Inspected visits, customers, points ledger, and RLS definitions in `packages/database/supabase/migrations/20260422120000_initial_schema.sql`.
- Searched for Scanner-specific automated tests and found none.

#### What works
- `/scanner` is protected by `ProtectedRoute`.
- Scanner is reachable from dashboard quick actions and shared `DashboardNav`.
- Dashboard decision logic can route owners to `/scanner` after a campaign has been sent.
- The scanner uses `@yudiel/react-qr-scanner` with rear camera preference, QR format, and a 500ms scan delay.
- The screen is designed as a full-screen camera-first mobile view with floating back and torch controls.
- The scanner loads the authenticated owner's first restaurant through browser Supabase and reads `points_per_dollar`.
- If no restaurant is found or restaurant loading fails, the scanner shows a boot error.
- QR parsing accepts either a raw UUID or a string containing a UUID.
- On scan, the UI looks up `customers` by scanned id and the current restaurant id.
- Unknown/invalid QR codes show user-facing errors and return to scanning.
- A found customer opens an action sheet with current name and point balance.
- Visit registration validates a positive dollar amount, converts it to cents, computes points as `Math.round(amount * points_per_dollar)`, and calls `supabase.rpc("record_visit_and_points", ...)`.
- Redemption validates reason, positive integer points, and client-side insufficient balance before calling `supabase.rpc("record_redemption", ...)`.
- Success state shows the added or removed point delta and offers to scan another card.
- Escape key closes non-scanning states and returns to scanning.
- Torch toggling attempts to apply `torch` constraints when the active camera track supports it and silently no-ops otherwise.
- The database RPC migration is designed to keep visit/points writes atomic: insert visit, insert `points_transactions`, and update `customers.points_balance` inside `record_visit_and_points`.
- The redemption RPC locks the customer row, checks balance server-side, inserts a negative `points_transactions` row, and updates `customers.points_balance`.
- RPCs are `security invoker`, granted to `authenticated`, and rely on existing RLS policies for restaurant/customer authorization.
- Current validation passes: `pnpm test` reported `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.

#### What does not work / limitations
- There are no rendered component tests for `ScannerView`.
- There are no automated tests for QR parsing, invalid QR handling, customer lookup, visit amount validation, redemption validation, insufficient balance, RPC errors, success state, Escape reset, or torch behavior.
- There are no static or integration tests covering `record_visit_and_points` or `record_redemption` migrations.
- No browser/device test was run, so actual camera permissions, iOS Safari behavior, Android Chrome behavior, torch support, QR framing, and mobile layout are unverified.
- Scanner uses direct browser Supabase queries and RPC calls, so live behavior depends on active Supabase session, RLS policies, and deployed RPCs.
- The scanner uses the first restaurant owned by the session; multi-restaurant selection is not implemented.
- Points calculation is simple rounding of dollars times `points_per_dollar`; there is no displayed preview of the exact points before submit beyond the rate text.
- Visit and redemption RPC return the new balance, but the UI currently displays only the delta and does not update/show the new balance in the success state.
- Camera scanner remains mounted whenever `restaurantId` exists; scan callbacks ignore non-scanning stages, but the camera can remain active behind the action sheet.
- Errors from Supabase/RPC/camera can surface raw backend or browser messages.
- Public/customer wallet QR payload is the raw customer id, so scanner lookup depends on that id being readable from the pass QR.
- There is no manual fallback for entering a customer id or phone if camera scanning fails.
- Several visible scanner strings still show encoding damage in the workspace display, such as `camÃ©ra`, `RÃ©demption`, and `Envoiâ€¦`.

#### Bugs found
- No new application-code bug confirmed in this pass.
- Test/deployment gap: the visit/redemption RPCs are not covered by current automated tests, so atomic point ledger behavior is asserted by migration inspection only.

#### Risks
- Live scanner may fail if the RPC migration is missing, stale, or blocked by RLS.
- Camera permission, HTTPS requirements, iOS/Android quirks, and torch support can break the primary workflow despite passing unit tests.
- Missing tests could allow regressions in QR parsing, customer scoping, point math, validation, and insufficient-balance handling.
- Direct browser Supabase access must remain protected by correct RLS for customers, visits, and points transactions.
- Raw customer ids in QR codes are easy to copy; unauthorized redemption is mitigated by protected owner scanner access, but leaked ids still expose stable customer identifiers.
- Lack of manual fallback can block checkout operations if scanning fails during service.
- Raw technical errors and mojibake can reduce operator confidence at the counter.

#### Next required action
- Add rendered tests for scanner state transitions: boot error, invalid QR, unknown customer, found customer, visit validation, redemption validation, insufficient balance, RPC failure, success, and reset.
- Add database/RPC validation for `record_visit_and_points` and `record_redemption`: visit insert, points transaction insert, balance update, owner/non-owner RLS, invalid amounts, and insufficient balance.
- Run a real mobile browser smoke with camera permissions on iOS and Android: scan wallet QR, record visit, redeem points, invalid QR, camera denied, torch toggle, and rescan flow.
- Decide whether to add a manual customer lookup fallback for no-camera or damaged-QR situations.

### Module: API

#### Status
- Tested

#### What was tested
- Baseline `pnpm test` suite.
- API startup wiring in `apps/api/src/server.ts` and `apps/api/src/index.ts`.
- Authentication and ownership helpers in `apps/api/src/auth.ts`.
- Public restaurant and public enrollment controllers in `apps/api/src/public.ts`.
- Wallet controllers in `apps/api/src/wallet.ts`.
- Inventory controllers in `apps/api/src/inventory.ts`.
- Promo generation and promo send route logic embedded in `apps/api/src/server.ts`.
- Existing API tests: `auth.test.ts`, `public.test.ts`, `wallet.test.ts`, `inventory.test.ts`, and `services/passkit.test.ts`.

#### What works
- `pnpm test` passes across the workspace.
- API startup fails fast when Supabase URL or service role key is missing.
- `/health` is public and returns a simple OK payload.
- Bearer auth parsing is case-insensitive and rejects missing or invalid sessions.
- Restaurant ownership checks reject missing restaurants and non-owner users.
- Public enrollment validates restaurant id, required name/phone fields, and explicit SMS consent.
- Public enrollment rolls back the inserted customer when consent log insertion fails.
- Dashboard wallet generation requires an authenticated restaurant owner.
- Public Apple Wallet pass generation by client id is intentionally unauthenticated.
- Inventory API routes require authentication and restaurant ownership.
- Inventory current-week, draft save, completion, generated alerts, and stock-promo audit flows have focused mocked tests.
- Promo generation checks auth, audit existence, restaurant ownership, empty audit responses, Anthropic response shape, and persists a promotion draft.
- Promo send checks auth, promotion ownership, already-sent state, missing SMS content, Twilio configuration, and opt-in customer selection.

#### What does not work / limitations
- No automated server-level route tests cover `createServer()` middleware, CORS behavior, `/health`, or full Express request/response flows.
- No tests currently cover the inline `/api/generate-promo` route.
- No tests currently cover the inline `/api/promotions/:id/send` route.
- No tests currently cover `GET /api/public/restaurant/:id`.
- No tests currently cover public `GET /api/wallet/apple/:clientId`.
- Supabase, Auth, RLS, Anthropic, Twilio, and Apple PassKit are covered with mocks or inspection only; no live integration smoke test is present.
- API validation is hand-written per route even though `zod` is available in the package.
- Several route errors return raw backend/provider messages, which is useful for debugging but can expose implementation details to clients.
- Promo SMS sending has no per-recipient persistence, retry state, throttling, or delivery status reconciliation.
- Promo generation prompt text is hardcoded to the La Boîte Jaune voice and is not restaurant-configurable.

#### Bugs found
- Confirmed API behavior bug: `POST /api/promotions/:id/send` updates the promotion status to `sent` after `Promise.allSettled()` even when one or more Twilio sends fail, including the case where all sends fail. The response reports `failed`, but the promotion can still be locked as sent with no retry state.
- No other new confirmed API bug found during this pass.

#### Risks
- Service-role routes must continue to be reviewed route by route for auth, owner checks, validation, and external API failure handling.
- Missing route-level tests around promo generation and promo sending leave the highest-risk external-provider flows under-tested.
- Public wallet pass generation by raw client id is easy to use, but client id entropy and exposure become part of the security model.
- External provider failures can partially mutate state, especially around promo creation, audit status updates, and SMS send status.
- Lack of rate limiting on public enrollment, public wallet pass generation, promo generation, and SMS send routes increases abuse risk.
- Mobile/web behavior depends on API error payload consistency, but errors are not normalized across modules.

#### Next required action
- Add focused tests for `/api/generate-promo` and `/api/promotions/:id/send`, especially Anthropic/Twilio failure paths and partial-send status semantics.
- Add route-level Express tests for public restaurant, public Apple Wallet pass, health, and CORS/auth middleware behavior.
- Decide whether promo status should remain draft/failed/partial when SMS delivery fails, then test the intended behavior before changing logic.
- Next module to test: Database/RLS.

### Module: Database/RLS

#### Status
- Not tested

#### What was tested
- Not tested in this pass.

#### What works
- Not evaluated in this pass.

#### What does not work / limitations
- Not evaluated in this pass.

#### Bugs found
- Not evaluated in this pass.

#### Risks
- Prior debug log entries show live inventory schema drift from repo migrations.

#### Next required action
- Compare live Supabase schema/RLS policies against repo migrations and run owner/non-owner access checks.

### Module: Mobile responsiveness

#### Status
- Not tested

#### What was tested
- Not tested in this pass.

#### What works
- Not evaluated in this pass.

#### What does not work / limitations
- Not evaluated in this pass.

#### Bugs found
- Not evaluated in this pass.

#### Risks
- There is no browser screenshot/e2e harness documented for responsive regression checks.

#### Next required action
- Run rendered mobile/desktop QA for dashboard, stock, clients, wallet settings, scanner, login, and public enrollment.

### Module: French copy / UI polish

#### Status
- Not tested

#### What was tested
- Not tested in this pass.

#### What works
- Not evaluated in this pass.

#### What does not work / limitations
- Not evaluated in this pass.

#### Bugs found
- Not evaluated in this pass.

#### Risks
- Several inspected files and docs display mojibake such as `Ã©`, `Ã `, and `â€¦`, which may appear in the UI if source encoding is not corrected.

#### Next required action
- Audit visible French copy in every screen and normalize encoding, tone, button labels, loading states, and error messages.
