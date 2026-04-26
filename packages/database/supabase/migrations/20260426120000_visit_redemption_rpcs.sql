-- Restaux — RPCs transactionnels: visite + rédemption (2026-04-26)
-- Garantit l'atomicité (CLAUDE.md §9.8): insert(s) + update(points_balance)
-- dans une seule transaction Postgres. SECURITY INVOKER → les policies RLS
-- existantes restent la source de vérité d'autorisation.

create or replace function public.record_visit_and_points(
  p_restaurant_id uuid,
  p_customer_id   uuid,
  p_points_added  integer,
  p_spend_amount  integer default null
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_visit_id     uuid;
  v_amount_cents integer := coalesce(p_spend_amount, 0);
  v_new_balance  integer;
begin
  if p_points_added is null or p_points_added < 0 then
    raise exception 'p_points_added doit être >= 0';
  end if;
  if v_amount_cents < 0 then
    raise exception 'p_spend_amount doit être >= 0';
  end if;

  -- Verrou + contrôle d'appartenance via RLS.
  perform 1 from public.customers
    where id = p_customer_id and restaurant_id = p_restaurant_id
    for update;
  if not found then
    raise exception 'client introuvable pour ce restaurant';
  end if;

  insert into public.visits (restaurant_id, customer_id, amount_cents, registered_by)
  values (p_restaurant_id, p_customer_id, v_amount_cents, auth.uid())
  returning id into v_visit_id;

  insert into public.points_transactions (restaurant_id, customer_id, delta, reason, visit_id)
  values (p_restaurant_id, p_customer_id, p_points_added, 'visit', v_visit_id);

  update public.customers
    set points_balance = points_balance + p_points_added
    where id = p_customer_id
    returning points_balance into v_new_balance;

  return v_new_balance;
end;
$$;

create or replace function public.record_redemption(
  p_restaurant_id   uuid,
  p_customer_id     uuid,
  p_points_deducted integer,
  p_reason          text
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_balance     integer;
  v_new_balance integer;
  v_reason      text := nullif(btrim(p_reason), '');
begin
  if p_points_deducted is null or p_points_deducted <= 0 then
    raise exception 'p_points_deducted doit être > 0';
  end if;
  if v_reason is null then
    raise exception 'raison requise';
  end if;

  select points_balance into v_balance
    from public.customers
    where id = p_customer_id and restaurant_id = p_restaurant_id
    for update;
  if not found then
    raise exception 'client introuvable pour ce restaurant';
  end if;

  if v_balance < p_points_deducted then
    raise exception 'solde insuffisant (% < %)', v_balance, p_points_deducted;
  end if;

  insert into public.points_transactions (restaurant_id, customer_id, delta, reason, note)
  values (p_restaurant_id, p_customer_id, -p_points_deducted, 'redemption', v_reason);

  update public.customers
    set points_balance = points_balance - p_points_deducted
    where id = p_customer_id
    returning points_balance into v_new_balance;

  return v_new_balance;
end;
$$;

grant execute on function public.record_visit_and_points(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.record_redemption(uuid, uuid, integer, text)            to authenticated;
