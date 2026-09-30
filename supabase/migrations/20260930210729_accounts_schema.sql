-- Accounts: profiles, addresses, orders and returns for signed-in users.
--
-- Every table has row-level security, and every policy checks ownership:
-- a user can only read and write their own rows. Nothing is granted to `anon`.
-- New tables aren't exposed to the Data API automatically any more, so the
-- grants below are explicit and limited to what the app does.
--
-- Order and return statuses are not stored: the app computes them from
-- timestamps (Preparing 2 min, Shipped until 5 min, Delivered; returns
-- Requested 2 min, then Refunded). The same timings are checked here where
-- they gate a write (cancelling, requesting a return).

-- Addresses ------------------------------------------------------------------

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 200),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text not null default '' check (char_length(line2) <= 200),
  city text not null check (char_length(city) between 1 and 100),
  region text not null check (char_length(region) between 1 and 100),
  postal_code text not null check (char_length(postal_code) between 1 and 20),
  created_at timestamptz not null default now(),
  -- Lets the profile's default point only at the same user's address (see below).
  unique (id, user_id)
);

create index addresses_user_id_idx on public.addresses (user_id);

-- Profiles -------------------------------------------------------------------

-- One row per user, created by the app on first sign-in (no trigger needed).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 200),
  phone text not null default '' check (char_length(phone) <= 40),
  default_address_id uuid,
  updated_at timestamptz not null default now(),
  -- The default must be one of this user's own addresses; deleting it clears only
  -- the default (the app then makes the next address the default).
  foreign key (default_address_id, id) references public.addresses (id, user_id) on delete set null (default_address_id)
);

-- Orders ---------------------------------------------------------------------

-- The address and the items are snapshots taken when the order was placed, so
-- later edits to the address book or the catalog never change a past order.
create table public.orders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (id ~ '^PL-[A-Z0-9]{8}$'),
  placed_at timestamptz not null default now(),
  address jsonb not null check (jsonb_typeof(address) = 'object'),
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) > 0),
  total numeric(12, 2) not null check (total >= 0),
  cancelled_at timestamptz check (cancelled_at is null or cancelled_at >= placed_at),
  -- The order id is unique per user: moving this browser's orders into an account
  -- twice can't create duplicates.
  primary key (user_id, id)
);

create table public.order_returns (
  user_id uuid not null default auth.uid(),
  order_id text not null,
  product_id integer not null,
  reason text not null check (reason in ('Changed my mind', 'Arrived damaged', 'Not as described', 'Wrong item sent', 'Other')),
  requested_at timestamptz not null default now(),
  -- One return per item per order.
  primary key (user_id, order_id, product_id),
  foreign key (user_id, order_id) references public.orders (user_id, id) on delete cascade
);

-- Row-level security ---------------------------------------------------------

alter table public.addresses enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_returns enable row level security;

revoke all on public.addresses, public.profiles, public.orders, public.order_returns from anon;

grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.orders to authenticated;
grant update (cancelled_at) on public.orders to authenticated; -- cancelling is the only change
grant select, insert on public.order_returns to authenticated;

-- Addresses: full control over your own.
create policy "Users read their own addresses" on public.addresses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own addresses" on public.addresses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users edit their own addresses" on public.addresses
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own addresses" on public.addresses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Profiles: read, create and edit your own.
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users create their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users edit their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Orders: read and add your own. The placement time can't be in the future (orders
-- moved in from this browser keep their original time).
create policy "Users read their own orders" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own orders" on public.orders
  for insert to authenticated
  with check ((select auth.uid()) = user_id and placed_at <= now() + interval '1 minute');
-- Cancelling: only while Preparing (the first 2 minutes), and only once.
create policy "Users cancel their own orders while preparing" on public.orders
  for update to authenticated
  using ((select auth.uid()) = user_id and cancelled_at is null and placed_at > now() - interval '2 minutes')
  with check ((select auth.uid()) = user_id and cancelled_at is not null);

-- Returns: read your own; request one only on your own delivered, uncancelled order.
-- (Each item's return window is checked by the app.)
create policy "Users read their own returns" on public.order_returns
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users return items from their own delivered orders" on public.order_returns
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and requested_at <= now() + interval '1 minute'
    and exists (
      select 1 from public.orders o
      where o.user_id = (select auth.uid())
        and o.id = order_id
        and o.cancelled_at is null
        and o.placed_at <= now() - interval '5 minutes'
    )
  );
