-- Hardening after review
-- 1) Sign-up must never fail because of the generated handle.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  name text;
  candidate text;
  attempt int := 0;
begin
  name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name',
                   new.raw_user_meta_data ->> 'user_name', split_part(coalesce(new.email, ''), '@', 1), 'traveler');
  base := regexp_replace(lower(name), '[^a-z0-9_-]+', '', 'g');
  base := regexp_replace(base, '^[_-]+', '');
  base := left(base, 14);
  if char_length(base) < 3 then base := 'traveler'; end if;
  loop
    candidate := base || '-' || substr(md5(new.id::text || attempt::text), 1, 8);
    begin
      insert into public.profiles (user_id, handle, display_name)
      values (new.id, candidate, left(name, 40));
      return new;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 5 then
        -- last resort: never block sign-up
        insert into public.profiles (user_id, handle, display_name)
        values (new.id, 'u-' || substr(replace(new.id::text, '-', ''), 1, 20), left(name, 40))
        on conflict (user_id) do nothing;
        return new;
      end if;
    end;
  end loop;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- 2) Snapshots: server-side timestamps and sane bounds (leaderboard input).
create or replace function private.snapshot_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;
create trigger rating_snapshots_guard before insert or update on public.rating_snapshots
  for each row execute function private.snapshot_guard();

alter table public.rating_snapshots
  add constraint rating_snapshots_rating_range check (rating >= 0 and rating <= 20),
  add constraint rating_snapshots_played_range check (played >= 0 and played <= 5000),
  add constraint rating_snapshots_best_size check (jsonb_typeof(best) = 'array' and jsonb_array_length(best) <= 40),
  add constraint rating_snapshots_completion_range check (completion_percent is null or (completion_percent >= 0 and completion_percent <= 1));

-- 3) The client updates the latest snapshot instead of inserting one every few seconds.
create policy "own update" on public.rating_snapshots for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant update on public.rating_snapshots to authenticated;
