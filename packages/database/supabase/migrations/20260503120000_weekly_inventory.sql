-- Restaux - weekly inventory MVP foundation (2026-05-03)
-- Per-restaurant inventory checks with derived alert snapshots.

--------------------------------------------------------------------------------
-- INVENTORY ITEMS
--------------------------------------------------------------------------------
create table public.inventory_items (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  name             text not null,
  unit             text not null default 'unit',
  category         text,
  min_quantity     numeric(12, 3) not null default 0 check (min_quantity >= 0),
  target_quantity  numeric(12, 3) check (target_quantity is null or target_quantity >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (id, restaurant_id)
);
create unique index inventory_items_restaurant_name_uniq
  on public.inventory_items(restaurant_id, name);
create index inventory_items_restaurant_id_idx on public.inventory_items(restaurant_id);
create index inventory_items_restaurant_active_idx
  on public.inventory_items(restaurant_id, is_active);

--------------------------------------------------------------------------------
-- INVENTORY CHECKS
--------------------------------------------------------------------------------
create table public.inventory_checks (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  week_start_date  date not null,
  status           text not null default 'draft' check (status in ('draft','completed')),
  notes            text,
  created_by       uuid references auth.users(id) on delete set null,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (id, restaurant_id),
  check (
    (status = 'draft' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);
create unique index inventory_checks_restaurant_week_uniq
  on public.inventory_checks(restaurant_id, week_start_date);
create index inventory_checks_restaurant_id_idx on public.inventory_checks(restaurant_id);
create index inventory_checks_restaurant_status_idx
  on public.inventory_checks(restaurant_id, status);
create index inventory_checks_restaurant_week_idx
  on public.inventory_checks(restaurant_id, week_start_date desc);

--------------------------------------------------------------------------------
-- INVENTORY CHECK LINES
--------------------------------------------------------------------------------
create table public.inventory_check_lines (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references public.restaurants(id) on delete cascade,
  inventory_check_id    uuid not null,
  inventory_item_id     uuid not null,
  item_name             text not null,
  quantity              numeric(12, 3) not null check (quantity >= 0),
  min_quantity_snapshot numeric(12, 3) check (min_quantity_snapshot is null or min_quantity_snapshot >= 0),
  target_quantity_snapshot numeric(12, 3) check (target_quantity_snapshot is null or target_quantity_snapshot >= 0),
  expires_on            date,
  condition             text not null default 'ok' check (condition in ('ok','watch','bad')),
  note                  text,
  checked_at            timestamptz not null default now(),
  unique (id, restaurant_id),
  unique (inventory_check_id, inventory_item_id),
  foreign key (inventory_check_id, restaurant_id)
    references public.inventory_checks(id, restaurant_id) on delete cascade,
  foreign key (inventory_item_id, restaurant_id)
    references public.inventory_items(id, restaurant_id) on delete restrict
);
create index inventory_check_lines_restaurant_id_idx
  on public.inventory_check_lines(restaurant_id);
create index inventory_check_lines_check_id_idx
  on public.inventory_check_lines(inventory_check_id);
create index inventory_check_lines_item_id_idx
  on public.inventory_check_lines(inventory_item_id);

--------------------------------------------------------------------------------
-- INVENTORY ALERTS
--------------------------------------------------------------------------------
create table public.inventory_alerts (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null references public.restaurants(id) on delete cascade,
  inventory_check_id       uuid not null,
  inventory_check_line_id  uuid references public.inventory_check_lines(id) on delete set null,
  inventory_item_id        uuid,
  alert_type               text not null check (alert_type in ('critical','reorder','sell_quickly','surplus')),
  severity                 text not null check (severity in ('low','medium','high','critical')),
  item_name                text not null,
  message                  text not null,
  score                    integer not null check (score >= 0),
  alert_snapshot           jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  foreign key (inventory_check_id, restaurant_id)
    references public.inventory_checks(id, restaurant_id) on delete cascade,
  foreign key (inventory_item_id, restaurant_id)
    references public.inventory_items(id, restaurant_id) on delete restrict
);
create index inventory_alerts_restaurant_id_idx on public.inventory_alerts(restaurant_id);
create index inventory_alerts_check_id_idx on public.inventory_alerts(inventory_check_id);
create index inventory_alerts_restaurant_type_idx
  on public.inventory_alerts(restaurant_id, alert_type);
create index inventory_alerts_restaurant_severity_idx
  on public.inventory_alerts(restaurant_id, severity);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------------------------------------
alter table public.inventory_items       enable row level security;
alter table public.inventory_checks      enable row level security;
alter table public.inventory_check_lines enable row level security;
alter table public.inventory_alerts      enable row level security;

create policy inventory_items_owner_all on public.inventory_items
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy inventory_checks_owner_all on public.inventory_checks
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy inventory_check_lines_owner_all on public.inventory_check_lines
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

create policy inventory_alerts_owner_all on public.inventory_alerts
  for all
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));
