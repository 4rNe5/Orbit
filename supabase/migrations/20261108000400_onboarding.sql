-- First sign-in profile setup.
-- 1) profiles.onboarded: false for new sign-ups until they confirm nickname, handle and visibility.
--    Accounts that already exist are marked done so nobody is interrupted.
alter table public.profiles add column onboarded boolean not null default false;
update public.profiles set onboarded = true;

-- 2) Handle availability for the setup form. Private profiles are hidden by RLS, so the check has to
--    run as definer; it returns only a boolean and treats the caller's own handle as available.
create or replace function public.handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select candidate ~ '^[a-z0-9][a-z0-9_-]{2,23}$'
     and not exists (
       select 1 from public.profiles p
       where p.handle = candidate and p.user_id <> (select auth.uid())
     );
$$;
revoke execute on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;
