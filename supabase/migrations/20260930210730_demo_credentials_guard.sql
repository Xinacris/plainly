-- The shared demo account's email and password can't be changed, so nobody can
-- lock other reviewers out. The app hides those controls for the demo, and this
-- trigger refuses the change even when the Auth API is called directly.
--
-- The demo is identified by its fixed, public address. Its profile (name, phone),
-- addresses and orders stay editable: that data is shared and reset every few days.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.guard_demo_credentials()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.email = 'demo@example.com' and (
    new.email is distinct from old.email
    or new.encrypted_password is distinct from old.encrypted_password
    or new.email_change is distinct from old.email_change
    or new.phone is distinct from old.phone
  ) then
    raise exception 'The demo account''s email and password can''t be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Supabase Auth updates auth.users as supabase_auth_admin, which runs the trigger.
grant usage on schema private to supabase_auth_admin;
grant execute on function private.guard_demo_credentials() to supabase_auth_admin;
revoke execute on function private.guard_demo_credentials() from public, anon, authenticated;

create trigger guard_demo_credentials
  before update on auth.users
  for each row execute function private.guard_demo_credentials();
