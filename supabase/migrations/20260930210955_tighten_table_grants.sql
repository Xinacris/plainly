-- Tighten table privileges to exactly what the app uses.
--
-- This project still grants every privilege on new public tables to
-- `authenticated` by default (the older Supabase behaviour), so the narrow
-- grants in the first migration came on top of full ones. The RLS test caught
-- it: an order's total could be targeted by UPDATE, where only `cancelled_at`
-- should be. RLS still blocked the row, but privileges should say the same.
-- TRUNCATE (which ignores RLS) was also granted; it's revoked here.

revoke all on public.addresses, public.profiles, public.orders, public.order_returns from authenticated;
revoke all on public.addresses, public.profiles, public.orders, public.order_returns from anon;

grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.orders to authenticated;
grant update (cancelled_at) on public.orders to authenticated; -- cancelling is the only change
grant select, insert on public.order_returns to authenticated;
