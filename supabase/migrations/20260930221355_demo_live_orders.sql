-- The shared demo account keeps two fixed "live" orders, PL-DEMOLIV1 and
-- PL-DEMOLIV2 (created by scripts/demo-reset.mjs). Order status is simulated from
-- the placement time, so they're only Preparing and Shipped for a few minutes.
-- When the demo signs in with nothing on its way, the app calls this function to
-- re-date them: one placed now (Preparing), one 3 minutes ago (Shipped). Nothing
-- new is created, so the shared account doesn't pile up orders.
--
-- Users can't change placed_at themselves (only cancelled_at is updatable), so this
-- needs SECURITY DEFINER. It refuses every caller except the demo account, touches
-- only those two rows, and isn't executable by anonymous visitors.

create function public.refresh_demo_orders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  demo uuid;
begin
  select id into demo from auth.users where email = 'demo@example.com';
  if demo is null or (select auth.uid()) is distinct from demo then
    raise exception 'Only the demo account can refresh its orders.' using errcode = '42501';
  end if;

  delete from public.order_returns where user_id = demo and order_id in ('PL-DEMOLIV1', 'PL-DEMOLIV2');
  update public.orders set placed_at = now(), cancelled_at = null
    where user_id = demo and id = 'PL-DEMOLIV1';
  update public.orders set placed_at = now() - interval '3 minutes', cancelled_at = null
    where user_id = demo and id = 'PL-DEMOLIV2';
end;
$$;

revoke execute on function public.refresh_demo_orders() from public, anon;
grant execute on function public.refresh_demo_orders() to authenticated;
