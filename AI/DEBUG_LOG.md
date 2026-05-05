# Debug Log

## 2026-05-05

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Clients

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared 10 tests, database 6 tests, API 26 tests, and web 21 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/customers` is protected by `ProtectedRoute`.
- `ClientsView` loads the authenticated owner's first restaurant, lists customers ordered newest first, and has loading, empty, and error states.
- Dashboard manual enrollment requires name, phone, and explicit SMS consent before submit is enabled.
- Dashboard enrollment inserts SMS opt-in fields and a matching `consent_log` row with source `dashboard_manual`.
- If dashboard consent logging fails, the page now tries to delete the just-created customer, then falls back to disabling SMS opt-in if deletion fails.
- Listed customers can trigger `POST /api/wallet/generate` with the active bearer token; the API verifies restaurant ownership before generating a pass.
- Public enrollment loads restaurant branding, requires explicit SMS consent, calls `POST /api/public/enroll`, and shows a wallet link after success.
- Public enrollment API validates consent before writes and rolls back the customer if `consent_log` insertion fails.
- Existing coverage is helper/API focused: consent payload helpers, public enrollment controller paths, and authenticated wallet owner checks.
- Main gaps remain rendered/e2e coverage, live RLS validation, phone normalization, edit/delete/merge/opt-out workflows, and signed/expiring public pass links.
- No new application-code bug was confirmed in this pass.

### Next Module To Test
- Carte identite / wallet

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Stock-to-promo

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared 10 tests, database 6 tests, API 26 tests, and web 21 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- Stock-to-promo is gated in the Stock UI to completed checks with an inventory check id and at least one marketable `sell_quickly` or `surplus` alert.
- Reorder-only and critical-only alerts do not enable the CTA and do not create an audit; they are used only as context when separate marketable candidates exist.
- `/api/inventory/checks/:id/stock-promo-audit` requires bearer auth, loads the inventory check, verifies restaurant ownership, requires completed status, and reads persisted `inventory_alerts`.
- The stock audit response prioritizes `sell_quickly` before `surplus`, includes up to five campaign candidates, and can include reorder/critical operational context.
- The endpoint embeds `stock-promo:inventory-check:<id>` in `audits.response`, searches for that marker before insert, and returns an existing draft promotion id/SMS when one exists.
- The Stock page reuses existing `/api/generate-promo` after receiving a new `audit_id`, then displays generated SMS and promotion id on `/stock`.
- Repeated CTA clicks are guarded in the page by loading/generated state and in the backend by marker lookup, but idempotency is not database-enforced and concurrent first-time requests can still race.
- A prior live Supabase stock-to-promo contract smoke passed through completed alerts -> stock audit -> `/api/generate-promo` -> draft promotion; later stock smokes documented live inventory schema drift that can still block prerequisites.
- No new application-code bug was confirmed in this pass.

### Next Module To Test
- Clients

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Stock

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared 10 tests, database 6 tests, API 26 tests, and web 21 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/stock` is protected by `ProtectedRoute`, linked from dashboard quick actions, and exposed in shared `DashboardNav`.
- Stock loads the authenticated owner's first restaurant through browser Supabase, then calls `GET /api/inventory/checks/current-week` with bearer auth and the computed Monday week start.
- The UI handles no-check, draft, and completed states. No-check starts with one empty editable line; draft maps saved lines into editable form state; completed maps lines and persisted alerts into read-only/locked UI state.
- Line inputs cover product name, quantity, optional minimum, optional expiry date, and condition. Add/remove product controls exist and preserve at least one line.
- The visible `Cible` field is absent from the current Stock form and web payload helper; API/shared logic still supports target quantity for persisted/historical lines and surplus derivation.
- Draft save uses `PUT /api/inventory/checks/current-week/draft`; completion saves/uses a check id and calls `POST /api/inventory/checks/:id/complete`.
- Completion returns server-derived alerts, grouped in the UI as critical, reorder, sell quickly, and surplus.
- The stock-to-promo CTA is present and gated to completed checks with `sell_quickly` or `surplus` alerts.
- Automated coverage remains helper/API/static-migration focused: no rendered Stock component or browser/mobile e2e test exists.
- No new application-code bug was confirmed in this pass.
- Existing deployment/schema blocker remains: prior live Supabase smoke attempts showed the inventory schema did not match the repo migration, especially `inventory_check_lines.inventory_check_id` and `min_quantity_snapshot`.

### Next Module To Test
- Stock-to-promo

### Task
Fix highest-priority confirmed dashboard-owned bug only.

### Module
- Dashboard / manual customer enrollment consent path

### Change
- Fixed the confirmed consent traceability failure in `apps/web/src/components/ClientsView.tsx`.
- When dashboard manual enrollment creates a customer but `consent_log` insertion fails, the UI now attempts to delete that just-created customer.
- If deletion fails, the UI falls back to updating the customer with `opt_in_sms: false` and `opt_in_sms_at: null`.
- Added `buildDashboardConsentRollbackUpdate()` in `apps/web/src/lib/customerConsent.ts`.
- Added a focused helper test in `apps/web/src/lib/customerConsent.test.ts`.
- No new features were added.

### Validation Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared 10 tests, database 6 tests, API 26 tests, and web 21 tests passed.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for `@app/web#test`.

### Remaining Risks / TODOs
- The dashboard manual enrollment path is still a sequence of browser Supabase writes, not a true database transaction.
- A future API route or RPC should create the customer and consent log atomically.
- Rendered `ClientsView` tests are still missing for the consent-log failure path.

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- API

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- API startup wires CORS, JSON parsing, request logging, Supabase service-role client, Anthropic, wallet, public, inventory, promo generation, and promo sending routes.
- Auth helpers correctly reject missing/invalid bearer sessions and enforce restaurant ownership in covered tests.
- Public enrollment validates required fields and explicit SMS opt-in, checks restaurant existence, inserts customer opt-in data, and rolls back the customer if consent logging fails.
- Dashboard wallet generation is authenticated and owner-checked; public Apple Wallet generation by client id remains intentionally unauthenticated.
- Inventory routes are authenticated and owner-checked, with tests for current-week loading, draft save, completion, alert persistence, and stock-promo audit creation/reuse.
- Main gaps: no route-level Express tests for server middleware/CORS/health, no tests for `/api/generate-promo`, no tests for `/api/promotions/:id/send`, no public restaurant route test, no public Apple pass route test, and no live Supabase/Auth/RLS/Anthropic/Twilio/PassKit smoke test.
- Bug found: `/api/promotions/:id/send` marks a promotion `sent` after `Promise.allSettled()` even when one or more Twilio sends fail, including the all-failed case; the response reports failures but the promotion has no retry state.
- Risks: service-role access depends on complete owner checks, raw provider/backend errors can leak to clients, public raw client-id wallet passes rely on id secrecy, external-provider failures can partially mutate state, and public/provider routes have no rate limiting.

### Next Module To Test
- Database/RLS

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Scanner

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/scanner` is protected and exposed through dashboard quick actions/shared navigation.
- Scanner loads the owner's first restaurant, reads `points_per_dollar`, and uses `@yudiel/react-qr-scanner` for rear-camera QR scanning.
- QR input accepts a raw UUID or a string containing a UUID, then looks up the customer by id and restaurant id.
- Visit registration validates a positive spend amount, computes rounded points, and calls `record_visit_and_points`.
- Redemption validates reason, positive points, and client-side sufficient balance before calling `record_redemption`.
- The database RPC migration is intended to atomically insert visits/points transactions and update `customers.points_balance`, with RLS enforced through `security invoker`.
- Main gaps: no ScannerView rendered tests, no automated QR/state/RPC error tests, no database/RPC integration tests, no real mobile camera QA, and no manual fallback when camera scanning fails.
- No new application-code bug was confirmed. The major test gap is that visit/redemption atomic ledger behavior is only inspected from migration SQL, not validated by automated tests.

### Next Module To Test
- API

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Carte identite / wallet

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/loyalty` is protected and lets the owner edit first-restaurant wallet card colors and description through direct browser Supabase updates.
- The wallet settings UI includes a live card preview and public enrollment link copy affordance.
- Public enrollment uses restaurant card colors and shows `/api/wallet/apple/:customerId` after signup.
- Clients can manually generate a `.pkpass` through authenticated `POST /api/wallet/generate`.
- The dashboard wallet generation API requires bearer auth, verifies restaurant ownership, and returns a pkpass with no-store headers.
- The public Apple pass endpoint remains unauthenticated by design and generates a pass from `customerId`.
- Passkit generation uses Apple certificates/env, wallet assets, tenant colors, customer name/points, restaurant name, and customer id as the QR barcode payload.
- Tests cover authenticated dashboard pass auth/owner boundaries and passkit color helper behavior only.
- Main gaps: no rendered/e2e wallet UI tests, no public Apple pass controller test, no real Apple Wallet credential/device smoke, no Google Wallet implementation, no signed/expiring public pass token, and no wallet push/update service.
- Bug found: Apple Wallet env docs do not match code. `passkit.ts` reads base64 env vars (`APPLE_WALLET_P12_BASE64`, `APPLE_WALLET_WWDR_BASE64`, `APPLE_WALLET_PASSPHRASE`) while the env examples document cert file path/password vars.

### Next Module To Test
- Scanner

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Stock-to-promo

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- Stock campaign creation is gated to completed stock checks with `sell_quickly` or `surplus` alerts.
- The Stock page calls `POST /api/inventory/checks/:id/stock-promo-audit`, then calls `/api/generate-promo` when the audit endpoint does not return an existing draft promotion.
- The stock audit endpoint verifies auth, restaurant ownership, completed check status, and persisted marketable alerts before creating or reusing an audit.
- Idempotency is marker-based through `stock-promo:inventory-check:<id>` in `audits.response`; existing draft promotions are returned directly when found.
- Generated SMS and promotion id display on `/stock`, but `/stock` does not send the campaign. Sending still uses the generic `/api/promotions/:id/send` path elsewhere.
- Automated coverage verifies stock audit response priority, no-op when no promo opportunity exists, audit creation, existing draft reuse, incomplete-check rejection, and web CTA eligibility.
- Main gaps remain: no rendered/e2e click flow, no focused unit tests for the inline `/api/generate-promo` route, no DB-enforced one-promotion-per-check constraint, and no current live smoke for duplicate behavior or sending.
- No new application-code bug was confirmed in this pass.

### Next Module To Test
- Carte identite / wallet

### Task
Continue TEST_GLOBALV1 module-by-module.

### Module Tested
- Stock

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; database 6 tests, shared 10 tests, API 26 tests, and web 20 tests passed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/stock` is protected by `ProtectedRoute` and appears in the shared navigation.
- Stock loads the owner restaurant, calls `GET /api/inventory/checks/current-week`, handles no-check, draft, and completed states, and locks editing/actions after completion.
- Editable draft lines support product name, quantity, minimum, expiry date, and condition; the visible `Cible` field is not present in the current form or web payload helper.
- Add/remove lines, draft save, completion, generated alerts, grouped alert display, and stock campaign eligibility are implemented in code.
- API inventory controllers require bearer auth and owner access, support current-week loading, draft replacement, completion, persisted alerts, and completed-read behavior.
- Automated coverage is focused on helpers, mocked API controllers, shared alert derivation, and static migration checks; there is still no rendered Stock component or browser/mobile e2e test.
- No new application-code bug was confirmed. The main known blocker remains live Supabase schema alignment from previous smoke tests.

### Next Module To Test
- Stock-to-promo

### Task
Continue global capability test document module-by-module.

### Module Tested
- Clients

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared, database, API, and web tests passed.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/customers` is protected and the Clients page loads the authenticated owner's first restaurant and customer list.
- Dashboard manual enrollment requires explicit SMS consent, inserts the customer with SMS opt-in fields, then attempts to insert a `consent_log` row.
- Public enrollment requires explicit SMS consent before submit and the public API validates consent before Supabase writes.
- Public enrollment API rolls back the customer if consent logging fails, and existing tests cover that path.
- Wallet pass generation from the Clients page uses an authenticated `/api/wallet/generate` call, with owner checks covered in API tests.
- Main gaps: no rendered/e2e tests for Clients/Public Enrollment, no phone normalization, no edit/delete/opt-out flow, public pass delivery is keyed by customer id, and some errors can show raw backend text.
- Bug found: dashboard manual enrollment is not atomic. If consent logging fails, the opted-in customer remains inserted without a durable consent proof.

### Next Module To Test
- Carte identite / wallet

## 2026-05-04

### Task
Continue global capability test document module-by-module.

### Module Tested
- Stock-to-promo

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared, database, API, and web tests replayed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- Stock-to-promo is enabled only after completed checks with `sell_quickly` or `surplus` alerts.
- The Stock page creates or reuses a stock audit through `POST /api/inventory/checks/:id/stock-promo-audit`, then calls the existing `/api/generate-promo` endpoint when needed.
- The backend verifies auth, check ownership, completed status, and persisted alert opportunities before creating an audit.
- A deterministic `stock-promo:inventory-check:<id>` marker is used to find existing stock audits.
- Existing draft promotions can be returned instead of inserting duplicate audits.
- Tests cover stock audit response priority, no-op when only operational alerts exist, audit creation from completed alerts, existing draft reuse, incomplete-check rejection, and web CTA eligibility.
- Main gaps: no rendered/e2e Stock-to-promo click flow, no dedicated `/api/generate-promo` unit coverage in this pass, no direct send from `/stock`, and idempotency is marker-based rather than DB-enforced.
- No new application-code bug was confirmed in this pass.

### Next Module To Test
- Clients

### Task
Continue global capability test document module-by-module.

### Module Tested
- Stock

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared, database, API, and web tests replayed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/stock` is protected, linked from dashboard quick actions, and present in shared dashboard navigation.
- Stock UI supports current-week loading, empty no-check state, draft editing, save draft, complete check, completed read-only state, alert grouping, and generated stock campaign display state.
- API inventory controllers cover current-week load, draft save, completion, persisted alerts, and owner checks.
- Shared inventory alert logic covers critical, reorder, sell quickly, surplus, bad condition, priority sorting, and healthy/empty states.
- Existing automated coverage is helper/API/static-migration focused; there is no rendered Stock page or browser/e2e test.
- Main live risk remains Supabase schema drift: prior smoke tests showed inventory tables/columns missing or mismatched with the repo migration.
- No new application-code bug was confirmed in this pass.

### Next Module To Test
- Stock-to-promo

### Task
Fix dashboard promo generation error visibility.

### Changes
- Rendered `auditError` in the `Recommandation IA` card when promo generation fails.
- Used a generic friendly French message instead of displaying raw API/provider error text.
- Styled the message as a calm dashboard alert with the blue warning token.
- Kept the existing promo generation control flow, API calls, and database behavior unchanged.
- Updated `AI/TEST_GLOBALV1.md` to mark the Dashboard audit bug as fixed.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/TEST_GLOBALV1.md`
- `AI/DEBUG_LOG.md`

### Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`.
- Warnings:
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - API public enrollment test intentionally logged the consent failure rollback path during the full run.
  - Turbo warned that no output files were found for `@app/web#test`.

### Remaining Risks / TODOs
- No rendered dashboard component test exists yet; validation for this pass is typecheck/unit based.
- A live dashboard smoke test should still verify the error appears during real generation failures.

### Task
Continue global capability test document module-by-module.

### Module Tested
- Dashboard

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared, database, API, and web tests replayed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### Findings Summary
- `/dashboard` is protected by `ProtectedRoute`.
- Dashboard quick actions include Dashboard, Stock, Clients, Scanner, and Carte.
- The "Aujourd'hui" decision section is implemented through `deriveDashboardDecision` and has focused helper tests for major states.
- KPI cards show customers, SMS opt-ins, and points; SMS opt-ins are counted with `opt_in_sms = true`.
- Loading, empty, and metrics-error states exist in code.
- Recommendation IA, generated SMS preview, send CTA, sent state, and send-error state are present.
- Dashboard accent styling is blue; critical/send-error states use red.
- Main gaps: no rendered dashboard component/e2e tests, no live promo generation/send smoke in this pass, hardcoded demo surplus response, no visible logout, and no browser screenshot validation.
- Bug found: promo generation errors are stored with `setAuditError` but `auditError` is not rendered in the dashboard UI.

### Next Module To Test
- Stock

### Task
Create global capability test document for Restaux1.

### Baseline Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; shared, database, API, and web tests replayed from cache.
- Warnings observed:
  - API public enrollment test logs the expected consent rollback path.
  - Web/Vitest logs `--localstorage-file was provided without a valid path`.

### File Created
- `AI/TEST_GLOBALV1.md`

### Module Tested
- Auth/session

### Findings Summary
- Web sessions use Supabase `getSession`, `onAuthStateChange`, persistent sessions, auto-refresh, and URL session detection.
- Protected app routes are gated by `ProtectedRoute`: dashboard, stock, customers, loyalty, and scanner.
- API service-role routes use bearer-token validation through `requireUserId` and owner checks through `requireRestaurantOwner`.
- Existing API tests cover bearer parsing, missing-token rejection, valid user lookup, owner allow, and non-owner reject.
- Main gaps: no web tests for login/session/protected routes, no live expired-session/RLS smoke, no visible logout control, and public Apple pass generation by `clientId` needs explicit product/security review.

### Next Module To Test
- Dashboard

### Task
Remove remaining warm accent styling from dashboard and stock UI.

### Changes
- Changed the global warning token from warm accent to blue so non-critical attention UI matches the black + blue identity.
- Changed the global tenant accent fallback to blue so Stock page active borders, buttons, pills, highlights, CTA backgrounds, and focus states render in the black + blue identity.
- Kept danger/error styling on the existing red danger token.

### Files Changed
- `apps/web/src/index.css`
- `AI/DEBUG_LOG.md`

### Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`.
- Warnings:
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - API public enrollment test intentionally logged the consent failure rollback path during the full run.
  - Turbo warned that no output files were found for `@app/web#test`.

### Task
Apply focused dashboard visual changes.

### Changes
- Removed the restaurant name from the dashboard header greeting; top-left now shows only `Salut`.
- Removed the desktop text navigation row from the dashboard header while keeping the quick action boxes, including Stock.
- Scoped dashboard tenant accent variables to blue so dashboard buttons, active quick actions, pills, borders, focus rings, and highlights use blue instead of the old warm tenant fallback.
- Kept the dark dashboard background unchanged.
- Changed attention state styling from warm warning to blue accent.
- Kept critical dashboard states red and changed send-error alert styling to red.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`.
- Warnings:
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - API public enrollment test intentionally logged the consent failure rollback path during the full run.
  - Turbo warned that no output files were found for `@app/web#test`.

### Remaining Risks / TODOs
- The dashboard blue accent is scoped locally in `DemoDashboard`; other app areas still use the global tenant accent unless updated separately.
- No browser screenshot harness exists, so validation is typecheck/unit based.

### Task
Remove the visible `Cible` field from the Stock page while preserving stock recommendations.

### Changes
- Removed `targetQuantity` from the Stock page editable form state and outgoing web payload.
- Removed the visible `Cible` input from each stock line.
- Kept the simplified entry fields: product name, quantity, minimum, expiry date, and condition/state.
- Rebalanced the desktop stock-line grid after removing the target field.
- Kept the API contract compatible: the API still accepts `target_quantity` from older clients and can still load existing completed checks with `target_quantity_snapshot`.
- Updated shared inventory alert derivation so surplus recommendations still work without a manual target by deriving a fallback surplus threshold from `minQuantity * 2`.

### Recommendation Behavior
- Low stock/reorder still uses `quantity < minQuantity`.
- Out of stock still uses `quantity <= 0`.
- Expiring soon still uses `expiresOn`.
- Bad condition still uses `condition = bad`.
- Surplus now uses explicit `targetQuantity` when present, otherwise falls back to `minQuantity * 2`.
- Stock campaign generation still consumes persisted inventory alerts through the stock audit response and existing `/api/generate-promo` flow.

### Tests Added / Updated
- Web tests updated so stock payload shaping no longer includes `target_quantity` from the visible form.
- Shared inventory tests added coverage for surplus detection when only `minQuantity` is provided.

### Validation Result
- Focused command: `pnpm --filter @app/shared test`
- Focused result: pass; 2 passed test files, 10 passed tests.
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass; 5 passed test files, 26 passed tests.
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`.
- Warnings:
  - API public enrollment test intentionally logged the consent failure rollback path.
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for some test tasks.

### Remaining Risks / TODOs
- The derived surplus rule is intentionally simple. Real inventory categories may need item-specific thresholds later.
- Existing rows with `target_quantity_snapshot` still load through the API, but the current Stock UI no longer shows or edits that value.

### Task
Run a focused visual QA pass for `/stock` and dashboard after the inventory feature.

### Visual QA Findings
- `/stock` mobile around 375px had a navigation gap: the responsive `DashboardNav` was wrapped in `hidden md:block`, so the mobile hamburger never appeared on the stock page.
- `/stock` generated SMS and promotion id blocks needed stronger wrapping to avoid overflow with long AI copy or UUID-like ids.
- Alert cards grouped by type were structurally clean, but long item names/messages could crowd the severity label on narrow screens.
- Stock empty, draft, completed, loading, and generated-campaign states were present and visually consistent with the existing card system.
- Dashboard quick actions already included `Stock` and the dashboard layout stayed clean; no dashboard code changes were needed.

### Changes
- Exposed the existing responsive `DashboardNav` on `/stock` mobile instead of hiding it below `md`.
- Added wrapping safeguards for alert item names/messages, generated SMS, and promotion ids.
- Cleaned up visible stock campaign/loading/generated copy accents.

### Files Changed
- `apps/web/src/pages/StockPage.tsx`
- `apps/web/src/pages/StockPage.test.ts`
- `AI/DEBUG_LOG.md`

### Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`.
- Warnings:
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - API public enrollment test intentionally logged the consent failure rollback path during the full run.
  - Turbo warned that no output files were found for `@app/web#test`.

### Remaining Risks / TODOs
- This repo still has no Playwright/browser screenshot harness, so the pass was code-level visual QA plus typecheck/unit validation rather than real rendered screenshot comparison.
- Authenticated live browser QA on real demo data would still be useful before a stakeholder demo.

### Task
Prevent duplicate stock promo drafts from repeated clicks.

### Changes
- Added backend idempotency to `POST /api/inventory/checks/:id/stock-promo-audit`.
- Embedded a deterministic stock audit marker in new audit responses: `stock-promo:inventory-check:<inventory_check_id>`.
- Before inserting an audit, the endpoint now searches existing stock audits for the same restaurant, question, and marker.
- If an existing stock audit already has a draft promotion, the endpoint returns that promotion id and SMS so the stock page can display it without calling `/api/generate-promo` again.
- Updated the stock page CTA to show a loading label while generation is in progress and keep the generated campaign state from re-enabling duplicate creation.

### Tests Added / Updated
- API test coverage now verifies the stock audit marker lookup before insert.
- API test coverage now verifies an existing stock promo draft is returned instead of inserting another audit.

### Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass; 5 passed test files, 26 passed tests.
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`.
- Warnings:
  - API public enrollment test intentionally logged the consent failure rollback path.
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for `@app/api#test` and `@app/web#test`.

### Remaining Risks / TODOs
- Without a database unique constraint or transactional insert keyed by `inventory_check_id`, two perfectly concurrent first-time requests could still race before either audit is visible. Repeated clicks from the UI are guarded by disabled/loading state, and normal repeated requests reuse the deterministic marker.
- The marker is stored in `audits.response` because the current schema visible to this task does not expose an audit metadata or `inventory_check_id` link.

### Task
Run a live Supabase smoke test for the new stock-to-promo flow.

### Smoke Test Setup
- Used the configured Supabase project from repo-root `.env`.
- Started the real Express API in-process on an ephemeral localhost port.
- Created a temporary confirmed Supabase Auth owner user through the service-role client.
- Created a temporary restaurant owned by that user.
- Signed in with the anon Supabase client and used the real bearer token against the API.
- Cleaned up the temporary promotion, audit, inventory alerts, inventory lines, inventory check, inventory items, restaurant, and auth user after the smoke.

### Smoke Test Result
- Result: pass after one blocking schema/write bug fix.
- Validated flow:
  - initial `/stock` data load through `GET /api/inventory/checks/current-week`
  - weekly inventory draft save
  - weekly inventory completion with marketable and reorder context alerts
  - completed `/stock` reload with persisted alerts
  - `POST /api/inventory/checks/:id/stock-promo-audit`
  - audit row creation from inventory alerts
  - existing `POST /api/generate-promo`
  - promotion draft creation
  - generated SMS returned to the stock page contract
  - dashboard-compatible promotion draft lookup by restaurant
- Live alert types returned: `sell_quickly`, `reorder`, `surplus`, `sell_quickly`.
- Generated promotion draft was created with status `draft`.
- Generated SMS length: 128 characters.
- Browser note: no Playwright/e2e tooling exists in this repo, so `/stock` display was validated by the same API JSON contract the page uses after clicking `Créer une campagne stock`, not by a visual browser automation pass.

### Bug Found
- Live Supabase requires `inventory_check_lines.item_name` to be non-null.
- The API wrote `inventory_item_id` and snapshots, but did not include `item_name` on inserted inventory check lines.
- Resulting live error before the fix:
  - `enregistrement des lignes echoue: null value in column "item_name" of relation "inventory_check_lines" violates not-null constraint`

### Fix Applied
- Updated `apps/api/src/inventory.ts` so inventory check line inserts include `item_name`.
- Updated `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql` so repo schema documents the live `inventory_check_lines.item_name` column.
- Updated static/database and API expectations for the new line snapshot field.

### Files Changed
- `apps/api/src/inventory.ts`
- `apps/api/src/inventory.test.ts`
- `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql`
- `packages/database/src/index.test.ts`
- `AI/DEBUG_LOG.md`

### Final Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass.
- Focused summary: 5 passed test files, 25 passed tests.
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; cached 2, executed 2.
- Warnings:
  - API public enrollment test intentionally logged the consent failure rollback path.
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for `@app/api#test` and `@app/database#test` because coverage outputs are configured but not produced.

### Remaining Risks / TODOs
- Add browser automation or a manual QA checklist for authenticated `/stock` UI rendering; the live smoke validated API behavior and the stock page data contract.
- The stock CTA can still create multiple audit/promotion drafts if clicked repeatedly.
- Promotion sending from the stock-generated draft was not executed; only draft visibility/compatibility with the dashboard promo flow was verified.
- Keep live Supabase schema and repo migrations aligned before the next inventory smoke.

### Task
Connect completed inventory alerts to campaign generation.

### Changes
- Added an inventory stock promo audit endpoint that turns completed inventory alerts into an `audits.response`.
- Kept the existing `audits -> /api/generate-promo -> promotions` flow: the stock page creates the audit, then calls the existing promo generation endpoint with `audit_id`.
- Prioritized `sell_quickly` and `surplus` alerts as campaign candidates.
- Included `critical` and `reorder` alerts only as operational context when they are separate from the promo candidates.
- Enabled the `/stock` CTA `Créer une campagne stock` when a completed check has marketable stock alerts.
- Displayed the generated SMS and promotion id on the stock page when generation succeeds.

### Endpoint / Flow Added
- `POST /api/inventory/checks/:id/stock-promo-audit`
  - Requires owner auth.
  - Requires the inventory check to be completed.
  - Loads persisted `inventory_alerts`.
  - Creates a pending row in `audits` with the stock-derived response.
  - Returns `audit_id` for the existing `/api/generate-promo` endpoint.

### Files Changed
- `apps/api/src/inventory.ts`
- `apps/api/src/inventory.test.ts`
- `apps/api/src/server.ts`
- `apps/web/src/pages/StockPage.tsx`
- `apps/web/src/pages/StockPage.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- API:
  - `buildInventoryAuditResponse` prioritizes marketable alerts and carries useful reorder/critical context.
  - Critical/reorder-only alerts do not create a campaign audit.
  - Completed inventory checks can create an audit for the existing promo flow.
  - Incomplete checks are rejected before audit creation.
- Web:
  - Stock campaign CTA eligibility is true only for `sell_quickly` or `surplus` alerts.

### Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass.
- Focused summary: 5 passed test files, 25 passed tests.
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 5 passed test files, 20 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; cached 2, executed 2; API 25 tests passed, web 20 tests passed, shared 9 tests replayed, database 6 tests replayed.
- Warnings:
  - API public enrollment test intentionally logged the consent failure rollback path.
  - Web/Vitest emitted `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for `@app/api#test` and `@app/web#test` because coverage outputs are configured but not produced.

### Remaining Risks / TODOs
- The flow is covered with mocked Supabase/unit tests, not a live Supabase smoke against the deployed inventory schema.
- The stock page creates a new audit/promotion each time the CTA is clicked; deduping by inventory check can be added later if product wants one campaign per completed check.
- Generated campaign send still happens through the existing dashboard promotion send path; `/stock` shows the generated draft but does not send it.

## 2026-05-02

### Task
Project audit and AI documentation cleanup.

### Changes
- Identified the real stack as Restaux: pnpm workspace, Turborepo, Vite React, TypeScript, Express, Supabase, Anthropic, Twilio, and wallet pass generation.
- Replaced stale Shopify/Liquid AI guidance with Restaux-specific workflow docs.
- Made pre-implementation baseline testing explicit through `pnpm test`.
- Documented that `pnpm test` is currently a typecheck-based baseline, not full behavioral coverage.

### Bugs Found
- `AI/ARCHITECTURE.md` and related docs described a Shopify Liquid theme that does not match this repository.
- `pnpm test` previously executed zero package tasks, creating a false pass.
- Several docs and UI strings contain encoding damage such as `Ã©` and `â€”`.

### Fixes
- Updated AI guidance to point agents at `CLAUDE.md` and the actual monorepo structure.
- Updated AI test workflow so agents must run baseline tests and define risks before implementation.

### Remaining Risks
- Real behavioral tests still need to be added.
- API routes using service-role Supabase access need authorization review.
- Consent logging and points ledger flows need integration-level validation.

### Task
Require a work plan followed by a test plan before implementation.

### Changes
- Updated AI workflow docs so every implementation task must present a work plan first and a test plan immediately after.
- Added a reusable pre-implementation format with baseline, work plan, test plan, manual checks, edge cases, and regression checks.

### Bugs Found
- The previous docs required test analysis, but the exact placement after the work plan was not explicit.

### Fixes
- Made the work-plan then test-plan order mandatory in `AI/AGENTS.md`, `AI/CODEX_RULES.md`, `AI/TESTS.md`, `AI/TEST_CODEXE.md`, and `AI/VALIDATION.md`.

### Remaining Risks
- The test command is still typecheck-based until real behavioral tests are added.

### Task
Add real automated tests while preserving typecheck validation.

### Baseline Test Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 32ms >>> FULL TURBO`; Turbo version shown: `2.9.6`.

### Files Changed
- `package.json`
- `pnpm-lock.yaml`
- `apps/web/package.json`
- `apps/web/src/components/ui/button.test.tsx`
- `apps/web/src/lib/colorUtils.test.ts`
- `apps/api/package.json`
- `apps/api/src/services/passkit.test.ts`
- `packages/shared/package.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`
- `packages/database/package.json`
- `packages/database/src/index.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added
- Web: React Testing Library test for `Button` default/preserved `type`; Vitest test for `getContrastColor`.
- API: Vitest test for wallet pass `getContrastColor` behavior.
- Shared: Vitest test for supported locale helper.
- Database: Vitest tests for server-only browser guard and missing Supabase service-role env guard.

### Issues Found
- Latest `vitest@4` has a Vite peer dependency mismatch with the existing Vite 5 web app.
- Vitest worker spawning fails inside the sandbox with `spawn EPERM`; validation must run outside the sandbox in this environment.
- API package uses NodeNext module resolution, so relative test imports need explicit `.js` extensions.

### Fixes Applied
- Pinned Vitest to `^3.2.4`, compatible with the current Vite 5 setup.
- Added `@testing-library/react` and `jsdom` only to `apps/web`.
- Updated package `test` scripts to run `pnpm run typecheck && vitest run`.
- Used `.js` extension in the API test import.

### Final Validation Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 0 cached, 4 total`; `Time: 8.207s`.
- Real tests run: 5 test files, 10 tests passed across `@app/web`, `@app/api`, `@app/shared`, and `@app/database`.

### Remaining Risks / TODOs
- Turbo reports no output files for each package test because `turbo.json` expects `coverage/**` but coverage is not enabled.
- These are unit tests only; Supabase RPCs, consent logging, wallet pass generation with real certificates, and SMS sending still need integration tests.

### Task
Audit production-readiness and harden public enrollment consent.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 34ms >>> FULL TURBO`; Turbo version shown: `2.9.6`.

### Roadmap Summary
- Critical: enforce consent and authorization boundaries; make dashboard customer creation write `consent_log`; add API tests for enrollment/promo/SMS/wallet failure states; verify Supabase RLS/RPCs against a real project; align deployment and env docs.
- High-value: clean mojibake in French UI strings; add generated Supabase types; improve public/dashboard error states; add owner-authenticated middleware for manager API routes.
- Nice-to-have: coverage reporting, Sentry, UI smoke tests, wallet visual fixtures, Google Wallet after Apple is stable.

### Selected Task
Harden public enrollment so the API requires explicit SMS opt-in before creating a customer.

### Files Changed
- `apps/api/src/public.ts`
- `apps/api/src/public.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added `apps/api/src/public.test.ts` with controller tests for:
  - rejecting `opt_in_sms: false` before any Supabase call
  - preserving the valid-consent path through the restaurant lookup

### Issues Found
- Public enrollment UI required SMS consent, but the API still accepted `opt_in_sms: false` and would create a customer plus `opt_out` log if called directly.
- Dashboard customer creation still inserts directly into `customers` without `consent_log`; this remains unresolved.

### Fixes Applied
- Added an API-side `opt_in_sms !== true` guard returning `400` with `consentement SMS explicite requis`.
- Added focused API regression tests.

### Final Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass; `2 passed` test files, `4 passed` tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 4.333s`.
- Turbo warning: `no output files found for task @app/api#test`; `turbo.json` expects `coverage/**`, but coverage is not enabled.

### Remaining Risks / TODOs
- Add consent logging for dashboard-created customers.
- Add owner authentication/authorization for service-role API routes.
- Add integration tests for public enrollment, points RPCs, wallet generation, and SMS sends.
- Clean mojibake in client-facing French strings.

### Task
Audit production readiness and make public enrollment consent logging fail closed.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 29ms >>> FULL TURBO`.
- Tests replayed from cache: database 1 file / 2 tests, shared 1 file / 1 test, API 2 files / 4 tests, web 2 files / 5 tests.

### Roadmap Summary
- Critical: protect service-role API routes with real authorization; make every consent write fail closed; verify points RPCs and RLS against a real Supabase project; validate wallet and SMS integrations with real credentials.
- High-value: finish dashboard consent hardening, clean mojibake in French UI strings, add generated Supabase types, improve API route unit coverage, and align deployment docs/env vars.
- Nice-to-have: coverage output, UI smoke tests, Sentry wiring, Google Wallet polish, and production monitoring checks.

### Selected Task
Make public enrollment fail closed if `consent_log` cannot be written after customer creation.

### Files Changed
- `apps/api/src/public.ts`
- `apps/api/src/public.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added API test coverage for consent logging failure rollback.
- Added API test coverage for the successful public enrollment path.

### Final Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass outside the sandbox after sandboxed Vitest failed with `spawn EPERM`.
- Focused summary: 2 passed test files, 6 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 34ms >>> FULL TURBO`.
- Full tests replayed from cache: database 1 file / 2 tests, shared 1 file / 1 test, API 2 files / 6 tests, web 3 files / 7 tests.

### Remaining Risks / TODOs
- Public enrollment rollback is best-effort; a database RPC would make customer plus consent logging truly atomic.
- Dashboard-created customer consent still needs review because it is frontend-driven and can leave a customer if consent logging fails.
- Manager API routes using the service-role key still need owner authorization.
- Real Supabase, Twilio, and Apple Wallet integration checks are still required.

### Task
Add owner authorization to dashboard wallet pass generation.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 31ms >>> FULL TURBO`.

### Selected Task
Protect `POST /api/wallet/generate`, the dashboard-triggered wallet pass route that uses the service-role Supabase client.

### Work Plan Summary
- Require a Supabase bearer token on dashboard pass generation.
- Resolve the authenticated user with `supabase.auth.getUser`.
- Compare that user id with the customer restaurant owner before generating the pass.
- Send the frontend session access token from `ClientsView`.
- Add focused API tests for missing auth, owner mismatch, and successful owner generation.

### Files Changed
- `apps/api/src/wallet.ts`
- `apps/api/src/wallet.test.ts`
- `apps/web/src/components/ClientsView.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added `apps/api/src/wallet.test.ts` with coverage for:
  - missing bearer token returns `401`
  - authenticated non-owner returns `403`
  - authenticated owner receives a generated `.pkpass`

### Final Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass outside the sandbox.
- Focused summary: 3 passed test files, 9 passed tests.
- Full command: `pnpm test`
- Sandboxed full result: failed due to Vitest `spawn EPERM` in `@app/api`.
- Full rerun outside sandbox result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 2 cached, 4 total`; `Time: 8.122s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 3 files / 9 tests, web 3 files / 7 tests.

### Remaining Risks / TODOs
- `GET /api/wallet/apple/:clientId` remains public by design for customer wallet download links; reconsider tokenized links before wider launch.
- `/api/generate-promo` and `/api/promotions/:id/send` still need owner authorization.
- Dashboard customer creation is still frontend-driven; an API/RPC path would be safer for atomic customer plus consent writes.
- Full tests may need to run outside this sandbox until Vitest worker spawning is configured differently.

### Task
Add owner authorization to AI promo generation.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass outside the sandbox.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 33ms >>> FULL TURBO`.

### Selected Task
Protect `POST /api/generate-promo`, the manager-triggered route that uses the service-role Supabase client and calls Anthropic.

### Work Plan Summary
- Extract bearer-token and restaurant-owner checks into `apps/api/src/auth.ts`.
- Reuse the auth helper in wallet pass generation.
- Require a valid Supabase session before promo generation.
- Verify the authenticated user owns the audit restaurant before calling Anthropic.
- Send the Supabase access token from `DemoDashboard` when generating a promo.

### Files Changed
- `apps/api/src/auth.ts`
- `apps/api/src/auth.test.ts`
- `apps/api/src/wallet.ts`
- `apps/api/src/server.ts`
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added `apps/api/src/auth.test.ts` with coverage for:
  - bearer token extraction
  - missing bearer token returns `401`
  - valid Supabase user resolution
  - non-owner restaurant access returns `403`
  - owner restaurant access passes

### Final Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass outside the sandbox.
- Focused summary: 4 passed test files, 14 passed tests.
- Full command: `pnpm test`
- Full result: pass outside the sandbox.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 2 cached, 4 total`; `Time: 8.46s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 4 files / 14 tests, web 3 files / 7 tests.

### Remaining Risks / TODOs
- `/api/promotions/:id/send` still needs owner authorization before sending SMS.
- `GET /api/wallet/apple/:clientId` remains public by design for customer wallet download links; consider tokenized links later.
- `POST /api/generate-promo` auth is unit-tested through helpers, but the Express route itself still needs integration tests.
- Full tests may need to run outside this sandbox until Vitest worker spawning is configured differently.

### Task
Add owner authorization to SMS promotion sending.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass outside the sandbox.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 37ms >>> FULL TURBO`.

### Selected Task
Protect `POST /api/promotions/:id/send`, the manager-triggered route that sends SMS through Twilio.

### Work Plan Summary
- Require a valid Supabase bearer token before loading/sending a promotion.
- Verify the authenticated user owns the promotion restaurant before Twilio config, recipient lookup, or message sending.
- Send the Supabase access token from `DemoDashboard` when sending a promotion.

### Files Changed
- `apps/api/src/server.ts`
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- No new route-specific tests were added in this step.
- Existing API auth helper tests still cover `401`, `403`, and owner checks used by this route.

### Final Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass outside the sandbox.
- Focused summary: 4 passed test files, 14 passed tests.
- Full command: `pnpm test`
- Full result: pass outside the sandbox.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 2 cached, 4 total`; `Time: 7.253s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 4 files / 14 tests, web 3 files / 7 tests.

### Remaining Risks / TODOs
- Add Express-level route tests for `/api/generate-promo` and `/api/promotions/:id/send`.
- `GET /api/wallet/apple/:clientId` remains public by design for customer wallet links; consider tokenized links before broader rollout.
- Dashboard customer creation is still frontend-driven; an API/RPC path would be safer for atomic customer plus consent writes.
- Real Twilio sending still needs validation with production A2P/10DLC setup.

### Task
Make dashboard customer creation record explicit SMS consent.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 37ms >>> FULL TURBO`; Turbo version shown: `2.9.6`.

### Roadmap Summary
- Critical path remains consent enforcement, owner authorization for service-role API routes, real Supabase/RPC validation, external integration checks, and production deployment smoke tests.
- This task continues the consent/compliance path by fixing the dashboard customer creation flow.

### Selected Task
Require manual SMS consent confirmation in the dashboard customer form and write a `consent_log` entry after customer creation.

### Files Changed
- `apps/web/src/components/ClientsView.tsx`
- `apps/web/src/lib/customerConsent.ts`
- `apps/web/src/lib/customerConsent.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added `apps/web/src/lib/customerConsent.test.ts` covering:
  - customer insert payload includes `opt_in_sms: true` and `opt_in_sms_at`
  - consent log payload uses `type: sms`, `action: opt_in`, and `source: dashboard_manual`

### Issues Found
- Dashboard customer creation previously inserted directly into `customers` with no SMS opt-in fields and no `consent_log`.
- The new dashboard flow is still not transactionally atomic because it uses two Supabase client calls from the browser.

### Fixes Applied
- Added a required SMS consent checkbox to the dashboard customer form.
- Disabled submission until consent is checked.
- Inserted customers with explicit SMS opt-in fields.
- Inserted a matching `consent_log` record immediately after customer creation.
- Surface an error if consent logging fails.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass; `3 passed` test files, `7 passed` tests.
- Full command: `pnpm test`
- Full result: pass; `Tasks: 4 successful, 4 total`; `Cached: 2 cached, 4 total`; `Time: 7.01s`.
- Turbo warnings: no output files found for `@app/api#test` and `@app/web#test`; `turbo.json` expects `coverage/**`, but coverage is not enabled.

### Remaining Risks / TODOs
- Move dashboard enrollment into an API route or RPC to make customer creation plus consent logging atomic.
- Add owner authorization for manager API routes.
- Clean mojibake in client-facing French strings.

### Task
Add a daily decision center section to the dashboard.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass outside the sandbox.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 38ms >>> FULL TURBO`.

### Files Changed
- `apps/web/src/lib/dashboardDecision.ts`
- `apps/web/src/lib/dashboardDecision.test.ts`
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added
- Added `apps/web/src/lib/dashboardDecision.test.ts` with coverage for:
  - no restaurant state
  - zero customers state
  - customers with no generated promo
  - generated promo waiting to send
  - sent campaign state
  - degraded metrics error state

### Issues Found
- The dashboard was organized around KPIs and demo campaign actions, not a daily decision priority.
- The existing dashboard had no top-level "what needs attention today" model.
- Reviews and inventory are not backed by any current schema or data source, so they were not fabricated.
- The focused web test failed inside the sandbox with Vite/esbuild `spawn EPERM`; rerunning outside the sandbox passed.

### Fixes Applied
- Added a pure dashboard decision helper that derives health status, priority, headline, explanation, urgent alerts, next action, and campaign state from existing dashboard signals.
- Added a real SMS opt-in count query from `customers.opt_in_sms`.
- Added a top `Aujourd'hui` decision section above the KPI cards.
- Preserved the existing KPI, surplus audit, promo preview/send, and recent customers sections.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass outside the sandbox.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass outside the sandbox.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 7.046s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 4 files / 14 tests, web 4 files / 13 tests.

### Remaining Risks / TODOs
- The new decision section has unit-tested decision logic but no browser screenshot/mobile visual verification yet.
- Reviews and inventory still need real data sources before they can become live dashboard sections.
- Some client-facing French strings still contain mojibake in existing files.
- Dashboard decision logic should eventually use real visits, promotion history, and review/sentiment data when those sources exist.

### Task
Polish dashboard loading, empty, and error presentation for client demos.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`.

### Selected Task
Make the new "Aujourd'hui" section and the existing KPI / customer / SMS preview sections feel reliable in client demos: clean skeletons, calm empty states with next-action hints, and friendly errors that hide raw technical details.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `apps/web/src/lib/dashboardDecision.ts`
- `apps/web/src/lib/dashboardDecision.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Updated `dashboardDecision.test.ts` so the metrics-error case now asserts:
  - calmer `attention` health status (not `critical`),
  - `urgentAlerts` does not leak the raw Supabase error string,
  - `nextAction` mentions retrying.

### Issues Found
- The "Aujourd'hui" section had no dedicated skeleton; during loading it rendered a placeholder decision header that read more like real content than a loading state.
- Skeleton blocks for KPI cards and recent customer rows had no visible animation, so they could be mistaken for empty cards.
- The metrics-error banner used a danger-red treatment and surfaced the raw Supabase error message to end users.
- The Aperçu Promo SMS card displayed a hardcoded fake SMS as its empty state, which looked like a real generated promo.
- The "no recent customers" empty state was a single muted line with no guidance on what to do next.
- Promo generation and SMS send flows surfaced raw `Error.message` / `Erreur API (status)` strings on network or HTTP failures.
- Restaurant lookup, restaurant creation, and audit insert errors surfaced raw Supabase messages on the audit path.

### Fixes Applied
- Added a `TodaySkeleton` component that mirrors the section's grid (status pill, headline, alerts panel) with `animate-pulse`, and renders during `metricsLoading`.
- Added `animate-pulse` to `KpiSkeleton` and `RecentRowSkeleton`.
- Added a `reloadKey` state plus `handleRetryMetrics` so users can retry the dashboard fetch without a full page reload; the metrics-error block is now a calm warning-tinted card with a "Réessayer" button and friendly French copy.
- Replaced the misleading SMS placeholder with a dashed empty-state card explaining where to start ("Décrivez vos surplus...") so client demos never show fake promo copy.
- Improved the "no clients yet" empty state with a clear headline plus a hint pointing to the Clients page and the public QR enrollment flow.
- Genericized fetch error handling on `/api/generate-promo` and `/api/promotions/:id/send`: 401/403 now show "Session expirée — reconnectez-vous…", other failures fall back to short French copy, and network errors surface a calm "Connexion interrompue…" message instead of `e.message`.
- Replaced raw Supabase error strings on the audit path (restaurant lookup, restaurant creation, audit insert) with stable French messages.
- Softened auditError and sendError blocks from danger-red to warning-tinted with `role="alert"`, keeping them visible without feeling alarmist.
- Updated `dashboardDecision.ts`: the metrics-error decision is now `attention` / `high` priority, no longer leaks the raw error into `urgentAlerts`, and points the user toward retry.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests (`colorUtils`, `customerConsent`, `dashboardDecision`, `Button`).
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.852s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 4 files / 14 tests, web 4 files / 13 tests.

### Remaining Risks / TODOs
- No browser/mobile visual verification of the new skeleton, empty, and error states yet — recommend a manual demo pass on a small viewport before pilot day.
- The retry button only retriggers the metrics fetch; if the underlying Supabase outage persists, the user still sees the calm error card. A backoff hint or status-page link could be added later.
- The KPI section still only renders two cards (clients, points distribués). The SMS opt-in count is consumed by the decision logic but not surfaced as a card; revisit if owners ask to see it directly.
- Promo generation and SMS send error handling now hides raw API/network details from the UI; consider adding a Sentry breadcrumb so the technical context is still captured server-side.
- `recentCustomers` empty state assumes "no customers" rather than "customers exist but none in the last window"; once the query is bounded by a date window, the copy will need a second variant.

### Task
Dashboard visual QA pass and minimal polish for client-readiness.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 31ms >>> FULL TURBO`.

### Visual QA Findings
- "Aucun blocage urgent…" caption in the Today section had ASCII-stripped accents (`detecte`, `donnees`) inconsistent with the rest of the FR UI.
- KPI cards rendered `0` while a metrics error was active because `kpis` is null on the error path; misleading next to the "indicateurs indisponibles" banner.
- "Derniers clients inscrits" header carried a green `En direct` badge during loading and during a metrics error, falsely implying live data.
- Recents section fell through to the "Aucun client inscrit" empty state when the metrics fetch errored, contradicting the error banner above.
- Long French names (e.g. `Marie-Hélène Tremblay-Lapointe`) on ~375px viewports could push the points pill out of the row because the inner text block had no `min-w-0` / `truncate`.
- The "Promotion envoyée à N clients" success block used `text-sm p-3 text-success` while the new error blocks use `text-caption p-4 text-text`, breaking visual rhythm.
- Header, Today section, audit section, and CTA copy were all clean and did not need changes.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None — all polish was presentational; existing decision and component tests still cover the underlying logic.

### Fixes Applied
- Replaced ASCII-stripped accents with proper French in the Today "no urgent blocker" caption.
- Rendered `—` in both KPI value tiles when `metricsError` is set, so users do not read a stale `0` next to the error banner.
- Hid the `En direct` badge on the recents card while loading or in error.
- Added a calm "Liste momentanément indisponible" placeholder for recents when `metricsError` is set, instead of the empty-state copy that implied no customers existed.
- Added `min-w-0 flex-1` and `truncate` to the recent customer name/phone block (and `shrink-0` to the avatar and points pill) so long names degrade gracefully on small viewports.
- Aligned the sent-promotion success block to the same shape as the warning blocks (`p-4`, `text-caption font-medium`, `role="status"`), keeping the green border/tint identity.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.916s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 4 files / 14 tests, web 4 files / 13 tests.

### Remaining Risks / TODOs
- `apps/web/src/lib/dashboardDecision.ts` still uses ASCII-stripped accents in its hardcoded strings (e.g. `Lecture differee`, `donnees`, `securite`, `Verifier`); they appear in the Today section through the decision object but were intentionally out of this task's scope.
- No real device/browser pass yet at 375px and 768px — only structural reasoning. A 5-min manual demo pass on a phone before the pilot is recommended.
- The Today section status pill, KPI numbers, and Aperçu/Recents sections share an `animate-pulse` rhythm during load, but the page does not have a global skeleton-shimmer; if a viewer scrolls between cards mid-load the cards animate independently, which is acceptable but worth a visual check on slow networks.
- KPI section still renders only two cards. `totalSmsOptIns` is computed and used by the decision logic but not surfaced as a card; revisit after pilot feedback.

### Task
Clean ASCII-stripped French in the dashboard decision flow.

### Baseline Test Result
- Date: 2026-05-02
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 32ms >>> FULL TURBO`.

### Files Changed
- `apps/web/src/lib/dashboardDecision.ts`
- `apps/web/src/lib/dashboardDecision.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Updated three assertions in `dashboardDecision.test.ts` to match the now-accented strings:
  - `nextAction` contains `"générer la campagne IA"` (was `"generer la campagne IA"`).
  - `urgentAlerts` contains `"Campagne générée en attente d'envoi."` (was `"Campagne generee en attente d'envoi."`).
  - `nextAction.toLowerCase()` contains `"réessayer"` (was `"reessayer"`).

### Issues Found
- Every branch of `deriveDashboardDecision` shipped ASCII-stripped French strings to the dashboard surface — `Lecture differee`, `donnees`, `securite`, `Reessayer`, `probleme`, `configure`, `Creer`, `operations`, `Generer`, `premiere`, `creera`, `Base a construire`, `creer`, `detecte`, `Envoi bloque`, `etre envoyee`, `prete`, `genere`, `generee`, `Journee lancee`, `envoyee`, `ete contactes`, `points a jour`, `Pret`, `decision`, `concrete`, `recent a relancer`, `Repondre a`, `generer la campagne IA`.
- A web-side grep confirmed no other client-facing French in `apps/web/src` had similar ASCII stripping; `DemoDashboard.tsx` was already clean after the previous polish pass.

### Fixes Applied
- Restored proper French accents and grave accents across all eight `deriveDashboardDecision` branches plus the default branch (status labels, headlines, explanations, urgent alerts, and next actions).
- Logic, return shape, status enums, control flow, and the `getCampaignState` helper were left untouched — only string content changed.
- Adjusted the three matching test assertions so the existing decision-logic coverage still passes against the corrected copy.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.643s`.
- Full tests: database 1 file / 2 tests, shared 1 file / 1 test, API 4 files / 14 tests, web 4 files / 13 tests.

### Remaining Risks / TODOs
- This pass covered the dashboard decision flow only. Mojibake/ASCII-stripped strings may still exist elsewhere in the app (e.g. `apps/web/src/components/ClientsView.tsx`, `apps/api` server messages, public enrollment, wallet pass templates). A repo-wide French copy audit is still open.
- No real device pass yet at 375px / 768px to confirm the longer accented strings still wrap cleanly inside the Today section's grid.
- Once a designer reviews the FR copy, some headlines/next actions may want to be tightened (e.g. shorter `nextAction` strings under 72 chars to avoid wrapping in the right column on tablet).

### Task
Add SMS opt-in customers as a third dashboard KPI.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 141ms >>> FULL TURBO`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. The change reuses the existing `totalSmsOptIns` query and render path; existing web typecheck and Vitest coverage are sufficient for this presentational KPI addition.

### Issues Found
- The dashboard already fetched `customers.opt_in_sms = true` for the Today decision model, but owners could not see the SMS-reachable audience as a visible KPI.
- The KPI loading state still rendered only two skeleton cards, which would look inconsistent after adding the third KPI.

### Fixes Applied
- Added a third KPI card labeled `Clients SMS opt-in` using the existing `kpis.totalSmsOptIns` value.
- Expanded the KPI grid to `lg:grid-cols-3` while keeping one column on mobile and two columns on small screens.
- Added a third KPI skeleton during metrics loading.
- Kept the neutral unavailable `—` state when `metricsError` is present, rather than showing a misleading `0`.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 42ms >>> FULL TURBO`.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects `coverage/**`, but coverage is not enabled.

### Remaining Risks / TODOs
- No browser/mobile screenshot pass yet to confirm the three-card KPI grid spacing at 375px, tablet, and desktop widths.
- The visible SMS opt-in count depends on the existing `customers.opt_in_sms` field being populated consistently across all enrollment paths.
- A future dashboard pass should add a small ratio or helper text comparing SMS opt-ins to total customers once the UX copy is reviewed.

### Task
Add a dedicated `Recommandation IA` section to the dashboard.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass.
- Summary from previous entry: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 42ms >>> FULL TURBO`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. The change is presentational and reuses the existing audit generation, promotion preview, and SMS send handlers.

### Issues Found
- The `Aujourd'hui` card mixed current status/problems with the action to take next, so the dashboard did not clearly read as `what's happening` followed by `what to do next`.
- The existing SMS preview remained useful, but there was no dedicated recommendation surface near the top of the dashboard.

### Fixes Applied
- Added a new `Recommandation IA` card immediately below `Aujourd'hui`.
- Empty state uses only real state and shows:
  - `Aucune recommandation générée`
  - `Complétez l'audit pour générer une action`
  - CTA: `Générer une recommandation`
- Recommendation state uses `generatedSms` / `promotionId` from the existing audit + promo flow.
- Added expected impact from the existing SMS opt-in count when available, with a neutral unavailable message when metrics cannot be read.
- Added CTAs:
  - `Voir le message`, which scrolls to the existing SMS preview.
  - `Envoyer la campagne`, which calls the existing SMS send handler.
- Did not change API routes, database access, audit insertion logic, promo generation, or the existing SMS preview/send section.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.999s`.
- Full tests: shared 1 file / 1 test, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No browser/mobile screenshot pass yet to verify the new card's spacing and CTA wrapping at 375px, tablet, and desktop widths.
- `Voir le message` depends on client-side smooth scrolling support; unsupported browsers will still keep the SMS preview available below.
- The recommendation does not load historical promotions from the database on refresh; it reflects the current in-memory generated promo flow, matching the existing dashboard behavior.
- Next recommended task: add a small dashboard component test for the empty/recommendation CTA states once the dashboard is split into testable subcomponents.

### Task
Focused visual polish pass on the new `Recommandation IA` card.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass.
- Summary from previous entry: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.999s`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. This pass only adjusted presentation, layout classes, and CTA hierarchy.

### Visual Polish Findings
- The card was clear but visually flatter than `Aujourd'hui`; it needed the same left accent treatment to feel like part of the top decision stack.
- CTA order was slightly weak in the generated state because `Voir le message` appeared before the primary campaign action.
- The generated state and sent state needed stronger visual labeling for demo clarity.
- The SMS preview below still had its own send button, which competed with the new recommendation card's primary campaign CTA.
- Mobile wrapping risk existed for longer CTA labels on narrow widths.

### Fixes Applied
- Added the same tenant-accent left bar and adjusted internal left padding to align visually with `Aujourd'hui`.
- Added state badges: `Action recommandée` before send and `Campagne envoyée` after send.
- Reordered generated-state CTAs so `Envoyer la campagne` is primary and `Voir le message` is secondary.
- Added `whitespace-normal`, centered text, and snug line height to recommendation buttons for safer mobile wrapping.
- Increased the desktop CTA column width at the `lg` breakpoint to reduce cramped button labels.
- Removed the SMS preview send button so the recommendation card owns the campaign action and the preview below stays focused on message confirmation.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.637s`.
- Full tests: shared 1 file / 1 test, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No screenshot/browser pass was run, so final visual confirmation at 375px, tablet, and desktop widths remains manual.
- There is now one send entry point for the generated campaign: the recommendation card primary CTA. The SMS preview remains a read-only confirmation area after generation.
- Next recommended task: run a quick browser QA pass at mobile and desktop widths before the pilot demo.

### Task
Upgrade the `Recommandation IA` section into the main dashboard action driver.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass from previous validation.
- Summary from previous entry: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.637s`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. This pass only changed layout classes and user-facing copy inside the existing recommendation section.

### Visual Polish Findings
- The previous layout still split content and CTA into separate columns, which made the primary action feel detached from the recommendation text.
- The title was readable but not strong enough for the section that should drive the next click.
- The empty state explained absence, but did not show what kind of recommendation the owner should expect.
- Some copy was passive (`Action prête`, `L'audit a produit`) instead of direct and action-oriented.

### Fixes Applied
- Converted the recommendation card content to a single vertical action flow: label, title, direct description, state detail, then CTA.
- Promoted the heading to the same `text-h1` scale used by the top decision card for stronger hierarchy.
- Tightened padding and gaps to reduce dead space.
- Rewrote generated-state copy to tell the user exactly what to do next: send now or verify the message.
- Rewrote empty-state copy around action: generate the next action from today's surplus.
- Added a concrete empty-state example: turning surplus chicken wings into an SMS promo for tonight.
- Kept the primary CTA aligned under the text with full-width mobile behavior and a constrained desktop width.
- Left API calls, state transitions, handlers, database access, and component boundaries unchanged.

### Final Validation Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.912s`.
- Full tests: shared 1 file / 1 test, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No screenshot/browser pass yet, so final confirmation of the new vertical flow at 375px, tablet, and desktop widths remains manual.

### Task
Reduce friction between `Recommandation IA` and campaign execution.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass from previous validation.
- Summary from previous entry: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.912s`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. This pass only adjusted CTA placement and in-card presentation.

### Visual Polish Findings
- The card already had the right primary and secondary actions, but the generated-state buttons sat after the impact panel.
- The user still needed the lower SMS preview for message confidence before sending, which added unnecessary scrolling.
- The main action should appear immediately after the recommendation copy so the path reads: recommendation, send, move forward.

### Fixes Applied
- Moved the generated-state primary CTA `Envoyer la campagne` directly under the recommendation copy.
- Kept `Voir le message` as the secondary CTA directly below the primary action.
- Added a compact `Message prêt` excerpt inside the recommendation card so users can confirm the SMS without scrolling.
- Kept the impact panel inside the card, below the action area.
- Preserved the empty state CTA as `Générer la recommandation`.
- Left API calls, database access, generation/send handlers, and existing SMS preview behavior unchanged.

### Final Validation Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 7.448s`.
- Full tests: shared 1 file / 1 test, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No browser screenshot pass yet, so mobile confirmation of the compact message excerpt and CTA stack remains manual.

### Task
Transform the dashboard layout into a mobile-first command center.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass from previous validation.
- Summary from previous entry: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 7.448s`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. This pass changed dashboard structure, layout classes, and copy while keeping existing handlers and data sources.

### Visual Polish Findings
- The dashboard still read like a desktop SaaS panel: brand header, separate wide KPI cards, and section cards stacked as admin modules.
- Mobile needed a clearer command path: greeting, quick navigation, today's state, main action, compact stats.
- The Today section carried good decision data, but the visual hierarchy was too verbose and the action was buried in text.
- KPI cards consumed too much vertical space on mobile and competed with the recommendation action.

### Fixes Applied
- Replaced the top header with a mobile-app-style greeting header: `Salut`, restaurant name, and a profile icon.
- Kept desktop navigation available inside the header at the `md` breakpoint and moved mobile navigation emphasis to quick actions.
- Added a four-item quick actions row using existing routes: Dashboard, Clients, Scanner, Carte.
- Refactored `Aujourd'hui` into a rounded command card with a shorter headline, icon tile, bullet context, and a visible primary CTA.
- Reused existing dashboard state to route the Today CTA toward retry, campaign send, scanner, clients, or recommendation generation.
- Upgraded `Recommandation IA` with a stronger rounded action-card treatment while preserving the direct send/view/generate handlers.
- Replaced three separate KPI cards with one compact mobile-friendly `Performance` card containing Clients, SMS opt-in, and Points.
- Kept the dark premium theme, existing data queries, API calls, database access, and business logic intact.

### Final Validation Result
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 8.846s`.
- Full tests: shared 1 file / 1 test, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No browser screenshot pass was run, so the native mobile feel still needs visual confirmation at 375px, tablet, and desktop widths.
- The restaurant name remains hardcoded as `La Boîte Jaune`, matching the existing demo context.

### Task
Remove the visible `Audit des surplus` dashboard block and top-right demo/pilot text while preserving promo generation logic.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass from previous validation.
- Summary from previous entry: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 8.846s`.

### Files Changed
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- None. This was a UI simplification only.

### Findings
- The dashboard still rendered the old lower `Audit des surplus` card even though `Recommandation IA` now owns recommendation generation.
- The recommendation section already called the same `handleGenerate` function, so removing the audit card did not require business-logic changes.
- The SMS preview empty state still referenced the removed Audit section.
- The mobile command-center header from the previous pass no longer showed the old top-right pilot/mode demo text.

### Fixes Applied
- Removed the visible `Audit des surplus` section, including textarea, audit error block, and old generation button.
- Kept `AUDIT_QUESTION`, `surplusText`, `auditStatus`, `handleGenerate`, audit insertion, and `/api/generate-promo` call intact.
- Confirmed `Recommandation IA` still passes `onGenerate={handleGenerate}` and the Today fallback CTA still calls `handleGenerate`.
- Removed now-unused audit UI variables/imports (`Send`, `buttonDisabled`, `buttonText`, and the surplus setter).
- Updated the SMS preview empty-state copy to point users to `Recommandation IA` instead of the removed Audit section.
- Preserved the section order: `Aujourd'hui` -> `Recommandation IA` -> KPI summary -> SMS preview / Clients.

### Final Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 4 passed test files, 13 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 6.577s`.
- Full tests: shared 1 file / 1 test, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/web#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- Because the audit textarea is removed, generation currently uses the existing default `surplusText` seed value from component state.
- No browser screenshot pass was run to visually confirm the cleaned stack.

### Task
Implement the first inventory system building block: pure inventory alert and prioritization logic.

### Baseline Test Result
- Date: 2026-05-03
- Command: `pnpm test`
- Result: pass.
- Summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 85ms >>> FULL TURBO`.

### Files Changed
- `packages/shared/src/inventory.ts`
- `packages/shared/src/inventory.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added `packages/shared/src/inventory.test.ts` with coverage for:
  - low stock -> reorder
  - out of stock -> critical
  - expiring soon -> sell_quickly
  - above target -> surplus
  - bad condition -> critical
  - score-based prioritization
  - healthy state
  - empty input

### Fixes Applied
- Added browser-safe inventory domain types:
  - `InventoryCheckLine`
  - `InventoryAlert`
  - `InventoryAlertResult`
  - alert type/severity/condition aliases
- Added `deriveInventoryAlerts(lines, now?)`.
- Implemented deterministic alert derivation for:
  - `quantity <= 0` as `critical`
  - `quantity < minQuantity` as `reorder`
  - `expiresOn` within 3 days as `sell_quickly`
  - `quantity > targetQuantity` as `surplus`
  - `condition = bad` as `critical`
- Added score-based priority using severity, urgency, expiration/condition pressure, and available quantity signal.
- Sorted alerts by highest score first.
- Returned `topPriorityItem` plus summary buckets:
  - `sellQuicklyItems`
  - `reorderItems`
  - `criticalItems`
- Kept the module isolated for now; no database, API, UI, or package barrel export changes were added.

### Final Validation Result
- Focused command: `pnpm --filter @app/shared test`
- Focused result: pass.
- Focused summary: 2 passed test files, 9 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 1 cached, 4 total`; `Time: 11.585s`.
- Full tests: shared 2 files / 9 tests, database 1 file / 2 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warnings: no output files found for `@app/api#test`, `@app/shared#test`, and `@app/web#test`; `turbo.json` expects outputs for those tasks, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- The scoring constants are deterministic but product-tunable; real client data may require weight adjustments.
- No database, API, or UI integration exists yet.
- Expiration logic assumes date-only `expiresOn` values and UTC day comparison.

### Task
Design and add the database foundation for the weekly inventory MVP.

### Baseline / Scope
- Scope kept to `packages/database` migrations/schema tests and `AI/DEBUG_LOG.md`.
- No suppliers, purchase orders, POS integration, franchise tables, API routes, shared logic, or dashboard behavior were added.

### Files Changed
- `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql`
- `packages/database/src/index.test.ts`
- `AI/DEBUG_LOG.md`

### Tables Added
- `inventory_items`
- `inventory_checks`
- `inventory_check_lines`
- `inventory_alerts`

### Schema Added
- Added restaurant-scoped inventory item catalog linked to `public.restaurants`.
- Added one weekly inventory check per `(restaurant_id, week_start_date)`.
- Added `draft` / `completed` status support on `inventory_checks`.
- Added inventory check lines with quantity, item snapshots, expiry date, and condition.
- Added persisted alert snapshots aligned with `deriveInventoryAlerts` output:
  - `alert_type`: `critical`, `reorder`, `sell_quickly`, `surplus`
  - `severity`: `low`, `medium`, `high`, `critical`
  - `item_name`, `message`, `score`, and `alert_snapshot jsonb`
- Added restaurant-oriented indexes for future per-restaurant queries and franchise rollup preparation.
- Added composite foreign keys so check lines and alerts stay scoped to the same restaurant as their parent check/item.
- Enabled RLS on all four tables and added owner policies matching the existing `restaurant_id in restaurants where owner_id = auth.uid()` pattern.

### Tests Added / Updated
- Extended `packages/database/src/index.test.ts` with static migration checks for:
  - all four inventory tables
  - restaurant indexes and restaurant linkage
  - weekly uniqueness
  - draft/completed status constraint
  - alert type/severity constraints
  - JSON alert snapshot column
  - RLS enablement and owner policy names

### Final Validation Result
- Focused command: `pnpm --filter @app/database test`
- Focused result: pass.
- Focused summary: 1 passed test file, 6 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 11.709s`.
- Full tests: database 1 file / 6 tests, shared 2 files / 9 tests, API 4 files / 14 tests, web 4 files / 13 tests.
- Turbo warning: no output files found for task `@app/database#test`; `turbo.json` expects outputs for that task, but coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- The migration is covered by static checks only; it has not been applied against a live Supabase/Postgres instance in this task.
- `inventory_checks.week_start_date` relies on application code to provide the correct week start day.
- `inventory_alerts.alert_snapshot` is intentionally flexible JSON for MVP snapshots; generated DB types or a stricter insert helper should come later.
- Next recommended task: add the API/RPC path that creates or updates a weekly draft check, stores lines, derives alerts, and persists alert snapshots transactionally.

### Task
Add the transactional API path for weekly inventory checks.

### Scope Notes
- Added API controllers and routes under `apps/api/src`.
- Exported the existing shared inventory alert helper from `packages/shared/src/index.ts` so `@app/api` can import `deriveInventoryAlerts` through the package entrypoint.
- No suppliers, purchase orders, POS integration, franchise HQ endpoints, dashboard changes, or promo behavior changes were added in this task.

### Endpoints Added
- `PUT /api/inventory/checks/current-week/draft`
  - Requires bearer auth.
  - Requires the authenticated user to own `restaurant_id`.
  - Creates or updates the draft check for `(restaurant_id, week_start_date)`.
  - Saves item rows as needed, replaces check lines, and clears stale alerts for the draft.
- `POST /api/inventory/checks/:id/complete`
  - Requires bearer auth.
  - Loads the check, verifies owner access through its `restaurant_id`, and rejects completed checks.
  - Accepts replacement lines or uses existing check lines.
  - Runs `deriveInventoryAlerts`, persists alert snapshots to `inventory_alerts`, then marks the check completed.

### Files Changed
- `apps/api/src/inventory.ts`
- `apps/api/src/inventory.test.ts`
- `apps/api/src/server.ts`
- `packages/shared/src/index.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- Added `apps/api/src/inventory.test.ts` with coverage for:
  - unauthenticated draft save rejected before Supabase table access
  - invalid line payload rejected with a friendly error
  - create/update draft check replacing lines
  - complete check deriving alerts, persisting alert snapshots, then marking completed
  - non-owner completion rejected with `403`

### Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass.
- Focused summary: 5 passed test files, 19 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 1 cached, 4 total`; `Time: 24.631s`.
- Full tests: database 1 file / 6 tests, shared 2 files / 9 tests, API 5 files / 19 tests, web 4 files / 13 tests.
- Turbo warnings: no output files found for `@app/api#test`, `@app/shared#test`, and `@app/web#test`; `turbo.json` expects coverage/output artifacts that are not configured.

### Remaining Risks / TODOs
- Supabase client calls are sequenced defensively, but this is not a true database transaction. Alert persistence happens before completion status, so alert failures avoid a partial completed state, but line/item writes may already be saved in draft.
- The API relies on application-provided `week_start_date` when present; default current week start is UTC Monday.
- No live Supabase integration test has applied the new migration and exercised the endpoint against real RLS/composite foreign keys.
- `inventory_alerts.inventory_item_id` is left null in persisted snapshots for MVP simplicity; if item-level joins are needed soon, carry the item id through line alert mapping.
- Next recommended task: add a small web inventory entry screen that calls the draft and complete endpoints, then run a live Supabase smoke test against a migrated project.

### Task
Build the first web inventory entry screen for weekly stock checks.

### Scope Notes
- Scope kept to `apps/web/src` plus `AI/DEBUG_LOG.md`.
- No API, database, POS, supplier, purchase order, franchise, or ERP-style features were added.
- Dashboard integration was limited to navigation/quick action access.

### Route Added
- `/stock`
- Nav label: `Stock`

### Files Changed
- `apps/web/src/App.tsx`
- `apps/web/src/pages/StockPage.tsx`
- `apps/web/src/pages/StockPage.test.ts`
- `apps/web/src/components/DashboardNav.tsx`
- `apps/web/src/DemoDashboard.tsx`
- `AI/DEBUG_LOG.md`

### UI Added
- Added mobile-first `Stock de la semaine` page in the same dark premium direction as the dashboard.
- Added the required explanatory copy:
  - `Mettez à jour les produits importants. Restaux détecte les alertes et les opportunités de campagne.`
- Added editable inventory rows with:
  - item name
  - quantity
  - optional minimum quantity
  - optional target quantity
  - optional expiration date
  - condition select: `OK`, `À surveiller`, `Mauvais`
- Added add/remove row controls.
- Added `Enregistrer le brouillon` and `Compléter le contrôle` actions.
- Added friendly loading, validation, error, and success states.
- Added alert result grouping:
  - `Critique`
  - `À recommander`
  - `À écouler`
  - `Surplus`
- Added disabled placeholder CTA: `Créer une campagne stock`.

### API Integration
- `PUT /api/inventory/checks/current-week/draft`
- `POST /api/inventory/checks/:id/complete`
- Uses the existing Supabase session pattern via `useSession()` and bearer token headers.
- Loads the owner restaurant through the existing browser Supabase client before sending API requests.

### Tests Added / Updated
- Added `apps/web/src/pages/StockPage.test.ts` covering:
  - Monday week-start calculation
  - stock line validation
  - API payload shaping without empty optional fields
  - returned alert grouping for the result view

### Validation Result
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 5 passed test files, 17 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 3 cached, 4 total`; `Time: 17.576s`.
- Full tests: database 1 file / 6 tests, shared 2 files / 9 tests, API 5 files / 19 tests, web 5 files / 17 tests.
- Warnings:
  - Vitest/jsdom emitted `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for `@app/web#test`; coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No browser screenshot pass was run, so mobile layout and date input rendering still need visual QA.
- The Stock page loads the first restaurant for the authenticated owner; multi-restaurant selection is not implemented yet.
- The page does not reload existing draft lines from the database; it starts with simple seeded rows for the first MVP entry flow.
- The campaign CTA is intentionally disabled until a stock-campaign endpoint exists.
- Next recommended task: add draft loading for the current week so owners can leave `/stock`, return later, and continue the same weekly check.

### Task
Add current-week draft loading for the `/stock` page.

### Scope Notes
- Scope kept to `apps/api/src/inventory.ts`, `apps/api/src/inventory.test.ts`, `apps/web/src/pages/StockPage.tsx`, `apps/web/src/pages/StockPage.test.ts`, and `AI/DEBUG_LOG.md`.
- No database migration, stock campaign endpoint, POS, supplier, purchase order, franchise, or dashboard stock summary changes were added.

### Endpoint Added
- `GET /api/inventory/checks/current-week`
  - Query params: `restaurant_id`, optional `week_start_date`
  - Requires bearer auth.
  - Verifies the authenticated user owns the requested restaurant.
  - Returns `check: null`, empty `lines`, and empty `alerts` when no current-week check exists.
  - Returns saved lines for draft and completed checks.
  - Returns persisted alerts only when the check is completed.

### Web Changes
- `/stock` now loads the authenticated owner restaurant, then fetches the current-week inventory check from the API.
- If no check exists, the form starts with one empty row and no fake stock data.
- If a draft exists, saved lines populate the form and the page shows `Brouillon repris`.
- If a completed check exists, saved lines and alerts populate the page, the badge shows completed state, and editing/actions are locked.
- Added a stock-check loading state and friendly read error handling.

### Files Changed
- `apps/api/src/inventory.ts`
- `apps/api/src/inventory.test.ts`
- `apps/api/src/server.ts`
- `apps/web/src/pages/StockPage.tsx`
- `apps/web/src/pages/StockPage.test.ts`
- `AI/DEBUG_LOG.md`

### Tests Added / Updated
- API:
  - loads the current-week draft check with saved lines
  - loads a completed current-week check with persisted alerts
- Web:
  - maps loaded draft lines into form state
  - maps completed checks into completed UI state with alerts

### Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass.
- Focused summary: 5 passed test files, 21 passed tests.
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 5 passed test files, 19 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 2 cached, 4 total`; `Time: 7.984s`.
- Full tests: database 1 file / 6 tests, shared 2 files / 9 tests, API 5 files / 21 tests, web 5 files / 19 tests.
- Warnings:
  - Vitest/jsdom emitted `--localstorage-file was provided without a valid path`.
  - Turbo warned that no output files were found for `@app/api#test` and `@app/web#test`; coverage/output artifacts are not configured.

### Remaining Risks / TODOs
- No browser screenshot QA was run, so completed-state locking and loading-state spacing still need visual verification on mobile.
- The current-week read endpoint is covered by mocked Supabase tests, not a live Supabase/RLS integration test.
- The page still uses the first restaurant owned by the session; multi-restaurant selection is not implemented.
- Completed checks are read-only in the UI; reopening or correcting a completed check would need an explicit product decision and API support.
- Next recommended task: run a live Supabase smoke test for the full stock flow: no check -> save draft -> reload draft -> complete -> reload completed alerts.

### Task
Run and document a live Supabase smoke test for the full weekly stock flow.

### Smoke Test Setup
- Used the configured Supabase project from repo-root `.env`.
- Started the real Express app in-process on an ephemeral localhost port.
- Created temporary confirmed Supabase Auth users through the service-role client:
  - one owner user
  - one non-owner user for the unauthorized access check
- Created a temporary restaurant owned by the owner user.
- Used the owner user's real Supabase session access token against the API endpoint.
- Cleanup attempted to delete both temporary users after the smoke attempt.

### Smoke Test Result
- Result: blocked before the stock flow could run.
- Blocking step: initial `GET /api/inventory/checks/current-week`.
- Exact API result:
  - HTTP `500`
  - `{"success":false,"error":"lecture de l'inventaire echouee: Could not find the table 'public.inventory_checks' in the schema cache"}`
- Interpretation: the live Supabase project has not had the weekly inventory migration applied, or PostgREST schema cache has not picked it up.

### Flow Coverage
- Auth/session: partially validated. Temporary users were created and the owner user signed in successfully.
- API endpoint reached: yes, local API received the authenticated `GET /api/inventory/checks/current-week`.
- RLS owner access: blocked before meaningful validation because `inventory_checks` does not exist remotely.
- Unauthorized access: not reached because the first owner read failed on missing table.
- Draft save/reload, complete, alert persistence, completed reload: not reached because the remote inventory tables are missing.

### Bugs Found
- No application-code bug was confirmed.
- Environment/deployment blocker found: live Supabase schema is missing `public.inventory_checks`.
- Local migration tooling blocker found:
  - README references `pnpm --filter @app/database migrate`.
  - `packages/database/package.json` does not define a `migrate` script.
  - No `DATABASE_URL`, `psql`, or Supabase CLI is available locally, so the migration could not be applied from this workspace.

### Fixes Applied
- No code fixes applied. The blocker is live database migration state/tooling, not a confirmed app bug.

### Validation Result
- Focused command: `pnpm --filter @app/api test`
- Focused result: pass.
- Focused summary: 5 passed test files, 21 passed tests.
- Focused command: `pnpm --filter @app/web test`
- Focused result: pass.
- Focused summary: 5 passed test files, 19 passed tests.
- Full command: `pnpm test`
- Full result: pass.
- Full summary: `Tasks: 4 successful, 4 total`; `Cached: 4 cached, 4 total`; `Time: 76ms >>> FULL TURBO`.
- Full tests: database 1 file / 6 tests, shared 2 files / 9 tests, API 5 files / 21 tests, web 5 files / 19 tests.
- Warning observed during focused web test: Vitest/jsdom emitted `--localstorage-file was provided without a valid path`.

### Remaining Risks / TODOs
- Apply `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql` to the live Supabase project and refresh the PostgREST schema cache.
- Add a real, documented migration command or deployment script so README setup instructions are accurate.
- Rerun the full live stock smoke after migration:
  - no current-week check
  - save draft with 2-3 lines
  - reload draft
  - complete check
  - verify generated/persisted alerts
  - reload completed alerts
  - verify non-owner access is blocked
- Next recommended task: add a working database migration command for `@app/database` or document the exact Supabase CLI/manual migration process, then rerun this smoke.

### Task
Rerun the live Supabase smoke test for the weekly stock flow.

### Smoke Test Result
- Result: blocked again, but progressed past the previous missing-table error.
- The live Supabase project now has the inventory tables, but the table columns do not match `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql`.
- Blocking step: `PUT /api/inventory/checks/current-week/draft`.
- Exact API result:
  - HTTP `500`
  - `{"success":false,"error":"suppression des lignes echouee: column inventory_check_lines.inventory_check_id does not exist"}`

### Live Schema Mismatch Found
- `inventory_check_lines` live columns present include:
  - `id`, `restaurant_id`, `check_id`, `item_id`, `quantity`, `expires_on`, `condition`, `note`
- `inventory_check_lines` repo/API expected columns missing live:
  - `inventory_check_id`
  - `inventory_item_id`
  - `min_quantity_snapshot`
  - `target_quantity_snapshot`
  - `checked_at`
- `inventory_alerts` live columns present include:
  - `id`, `restaurant_id`, `check_id`, `item_id`, `type`, `severity`, `item_name`, `alert_snapshot`, `created_at`
- `inventory_alerts` repo/API expected columns missing live:
  - `inventory_check_id`
  - `inventory_check_line_id`
  - `inventory_item_id`
  - `alert_type`
  - `message`
  - `score`
- `inventory_checks` is also missing live:
  - `created_by`
  - `started_at`
- `inventory_items` is missing live:
  - `is_active`

### Flow Coverage
- Auth/session: passed. Temporary owner and non-owner users were created and signed in successfully.
- Initial no-check read: passed. `GET /api/inventory/checks/current-week` returned success with no check before saving.
- Draft save: blocked by live schema mismatch on `inventory_check_lines.inventory_check_id`.
- Draft reload, completion, alert persistence, completed reload, and unauthorized stock read after save were not reached.

### Bugs Found
- No application-code bug was confirmed.
- Confirmed environment/schema bug: the live Supabase inventory schema is not the schema defined in the repo migration.

### Fixes Applied
- No code fixes applied. Updating the API to support the live mismatched schema would hide a migration/deployment problem and diverge from the repo schema.

### Validation
- No validation commands were rerun for this smoke-only rerun because no application code was changed.

### Remaining Risks / TODOs
- Align the live Supabase schema with `20260503120000_weekly_inventory.sql`.
- Refresh PostgREST schema cache after migration correction.
- Rerun the full smoke once the live schema matches the repo:
  - no current-week check
  - save draft with 2-3 lines
  - reload draft
  - complete check
  - verify generated/persisted alerts
  - reload completed alerts
  - verify non-owner access is blocked

### Task
Rerun the live Supabase smoke test again after partial schema correction.

### Smoke Test Result
- Result: still blocked, but progressed past the prior `inventory_check_id` missing-column error.
- Initial no-check read passed.
- Draft save reached line insertion and then failed.
- Exact API result:
  - HTTP `500`
  - `{"success":false,"error":"enregistrement des lignes echoue: Could not find the 'min_quantity_snapshot' column of 'inventory_check_lines' in the schema cache"}`

### Interpretation
- The live schema appears partially updated, but it still does not match `packages/database/supabase/migrations/20260503120000_weekly_inventory.sql`.
- `inventory_check_lines.min_quantity_snapshot` is still missing from the live PostgREST schema cache.

### Fixes Applied
- No code fixes applied. The blocker remains live schema alignment, not a confirmed app-code issue.

### Remaining Risks / TODOs
- Apply/repair the full inventory migration on Supabase, including snapshot columns on `inventory_check_lines`.
- Refresh PostgREST schema cache after applying the schema change.
- Rerun smoke after the live schema matches the repo migration.
