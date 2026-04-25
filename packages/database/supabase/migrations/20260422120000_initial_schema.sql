-- Restaux — schéma initial (Sprint 1, pivot War Room 2026-04-22)
-- Pilote: La Boîte Jaune. Workflow central: Option C (Proactive Audit).

create extension if not exists "pgcrypto";

--------------------------------------------------------------------------------
-- RESTAURANTS
--------------------------------------------------------------------------------
create table public.restaurants (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  timezone           text not null default 'America/Montreal',
  points_per_dollar  integer not null default 1 check (points_per_dollar > 0),
  created_at         timestamptz not null default now()
);
create index restaurants_owner_id_idx on public.restaurants(owner_id);

--------------------------------------------------------------------------------
-- AUDITS — Option C (le système questionne, le chef répond en texte libre)
--------------------------------------------------------------------------------
create table public.audits (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  question       text not null,
  response       text,
  status         text not null default 'pending' check (status in ('pending','completed')),
  asked_at       timestamptz not null default now(),
  responded_at   timestamptz
);
create index audits_restaurant_id_idx on public.audits(restaurant_id);

--------------------------------------------------------------------------------
-- PROMOTIONS
--------------------------------------------------------------------------------
create table public.promotions (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  audit_id        uuid references public.audits(id) on delete set null,
  content_sms     text,
  content_wallet  text,
  status          text not null default 'draft' check (status in ('draft','sent')),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index promotions_restaurant_id_idx on public.promotions(restaurant_id);
create index promotions_audit_id_idx on public.promotions(audit_id);

--------------------------------------------------------------------------------
-- CUSTOMERS (CASL/Loi 25 — champs de consentement conservés: §8 non négociable)
--------------------------------------------------------------------------------
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text,
  phone           text,
  email           text,
  opt_in_sms      boolean not null default false,
  opt_in_sms_at   timestamptz,
  opt_in_email    boolean not null default false,
  opt_in_email_at timestamptz,
  points_balance  integer not null default 0,
  created_at      timestamptz not null default now()
);
create unique index customers_restaurant_phone_uniq
  on public.customers(restaurant_id, phone) where phone is not null;
create index customers_restaurant_id_idx on public.customers(restaurant_id);

--------------------------------------------------------------------------------
-- VISITS
--------------------------------------------------------------------------------
create table public.visits (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  amount_cents   integer not null check (amount_cents >= 0),
  registered_by  uuid references auth.users(id),
  registered_at  timestamptz not null default now()
);
create index visits_restaurant_id_idx on public.visits(restaurant_id);
create index visits_customer_id_idx on public.visits(customer_id);

--------------------------------------------------------------------------------
-- POINTS_TRANSACTIONS — source unique de vérité pour points_balance
-- Remplace la règle §9.8 originale (visits/redemptions) par un ledger unifié.
--------------------------------------------------------------------------------
create table public.points_transactions (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  delta          integer not null,
  reason         text not null check (reason in ('visit','redemption','adjustment')),
  visit_id       uuid references public.visits(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);
create index points_tx_customer_id_idx on public.points_transactions(customer_id);
create index points_tx_restaurant_id_idx on public.points_transactions(restaurant_id);

--------------------------------------------------------------------------------
-- CONSENT_LOG — CASL / Loi 25 (obligatoire, §8 non négociable)
--------------------------------------------------------------------------------
create table public.consent_log (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  type         text not null check (type in ('sms','email')),
  action       text not null check (action in ('opt_in','opt_out')),
  source       text,
  ip           inet,
  user_agent   text,
  timestamp    timestamptz not null default now()
);
create index consent_log_customer_id_idx on public.consent_log(customer_id);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------------------------------------
alter table public.restaurants         enable row level security;
alter table public.audits              enable row level security;
alter table public.promotions          enable row level security;
alter table public.customers           enable row level security;
alter table public.visits              enable row level security;
alter table public.points_transactions enable row level security;
alter table public.consent_log         enable row level security;

-- restaurants : le owner seulement
create policy restaurants_owner_all on public.restaurants
  for all
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Helper (inline) pour toutes les tables avec restaurant_id :
-- restaurant_id in (select id from public.restaurants where owner_id = auth.uid())

create policy audits_owner_all on public.audits
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy promotions_owner_all on public.promotions
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy customers_owner_all on public.customers
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy visits_owner_all on public.visits
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy points_transactions_owner_all on public.points_transactions
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

-- consent_log : jointure via customers
create policy consent_log_owner_all on public.consent_log
  for all
  using (
    customer_id in (
      select c.id from public.customers c
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  )
  with check (
    customer_id in (
      select c.id from public.customers c
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  );
