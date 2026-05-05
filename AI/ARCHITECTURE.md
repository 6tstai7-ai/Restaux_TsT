# Architecture

Restaux is a monorepo SaaS for independent Quebec restaurants. The MVP helps a restaurant turn surplus food into revenue through a weekly free-text audit, AI-generated promotion copy, SMS broadcast, wallet loyalty cards, and a simple points ledger.

## Stack

- Monorepo: pnpm workspaces + Turborepo
- Frontend: Vite + React 18 + TypeScript
- UI: Tailwind CSS + small local shadcn-style primitives
- Icons: lucide-react
- Routing: react-router-dom
- PWA: vite-plugin-pwa
- Backend: Express + TypeScript
- Database/Auth: Supabase Postgres + RLS
- AI: direct Anthropic SDK calls
- SMS: Twilio
- Wallet: passkit-generator for Apple Wallet
- Shared contracts: TypeScript and Zod where useful
- Design: Pencil `.pen` files in `design/`
- Deploy: Vercel for web, Render for API unless changed in deployment docs

## Apps

- `apps/web`: manager dashboard, customer views, loyalty settings, scanner, login, and public enrollment.
- `apps/api`: health route, public enrollment API, promo generation, promotion send, wallet pass generation.

## Packages

- `packages/shared`: shared domain types and schemas. Keep browser-safe.
- `packages/database`: server-only Supabase utilities and migrations. Never import this package from `apps/web`.
- `packages/config`: shared TypeScript and lint config.

## Data Model

Core tables live in `packages/database/supabase/migrations`:

- `restaurants`
- `audits`
- `promotions`
- `customers`
- `visits`
- `points_transactions`
- `consent_log`

Rules:
- RLS must stay enabled on app tables.
- Browser code uses the public Supabase client with user auth.
- API code may use the service-role key only for server routes that have their own authorization and validation.
- Points changes must be ledgered in `points_transactions`.
- Consent changes must be recorded in `consent_log`.

## MVP Flow

1. Owner logs in.
2. Owner creates or uses the pilot restaurant.
3. Customer is added from dashboard or public enrollment with consent.
4. Owner answers the surplus audit in free text.
5. API calls Anthropic to generate SMS and wallet promo copy.
6. Owner approves/sends promotion to SMS opt-in customers.
7. Owner records visits and redemptions through transaction-safe RPCs.
8. Wallet pass reflects the customer loyalty balance.

## Current Constraints

- French-only MVP.
- Manual billing for pilot.
- No inventory modeling.
- No POS integration.
- No multi-location.
- No hidden mocks.
- Keep feature work on the demo-critical path in `CLAUDE.md`.
