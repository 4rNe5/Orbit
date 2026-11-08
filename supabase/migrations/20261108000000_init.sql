-- Orbit Rating — initial schema
-- Chart master data is public read / admin write (admin = app_metadata.role 'admin').
-- Scores, snapshots and profiles are owner-only, readable by others only when the profile is public.

create schema if not exists private;

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- ── chart master ───────────────────────────────────────────────────────────
create table public.data_versions (
  version            text primary key,
  chart_count        int  not null,
  song_count         int  not null,
  theoretical_rating numeric(6,3),
  source             text not null,
  is_current         boolean not null default false,
  imported_at        timestamptz not null default now()
);
create unique index data_versions_one_current on public.data_versions (is_current) where is_current;

create table public.charts (
  id            text primary key,                       -- '<songId>:<difficulty>'
  song_id       text not null,
  title         text not null,
  song_title    text not null,
  difficulty    text not null check (difficulty in ('I','II','III','IV','IV-α')),
  constant      numeric(3,1) not null check (constant > 0),
  level         text not null,
  pack          text not null,
  song_pack     text not null,
  version       text not null,
  default_order int  not null,
  update_order  int  not null,
  deleted       boolean not null default false,
  data_version  text not null references public.data_versions(version) on update cascade,
  unique (song_id, difficulty)
);
create index charts_data_version_idx on public.charts (data_version);

create table public.app_meta (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── user data ──────────────────────────────────────────────────────────────
create table public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  handle          text not null unique check (handle ~ '^[a-z0-9][a-z0-9_-]{2,23}$'),
  display_name    text not null default '' check (char_length(display_name) <= 40),
  is_public       boolean not null default false,
  show_completion boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.scores (
  user_id    uuid not null references auth.users(id) on delete cascade,
  chart_id   text not null references public.charts(id) on update cascade,
  score      int  not null check (score between 0 and 1010000),
  lamp       text not null default 'none' check (lamp in ('none','fc','ap')),
  updated_at timestamptz not null default now(),
  primary key (user_id, chart_id)
);
create index scores_chart_id_idx on public.scores (chart_id);

create table public.rating_snapshots (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  rating             numeric(6,3) not null,
  completion         numeric(8,3),
  completion_percent numeric(6,5),
  played             int not null,
  best               jsonb not null,               -- [{c: chartId, s: score, r: rating}] × ≤40
  data_version       text not null,
  created_at         timestamptz not null default now()
);
create index rating_snapshots_user_created_idx on public.rating_snapshots (user_id, created_at desc);

-- ── new user → profile ─────────────────────────────────────────────────────
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  name text;
begin
  name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name',
                   new.raw_user_meta_data ->> 'user_name', split_part(coalesce(new.email, ''), '@', 1), 'traveler');
  base := left(regexp_replace(lower(name), '[^a-z0-9_-]+', '', 'g'), 16);
  if char_length(base) < 3 then base := 'traveler'; end if;
  insert into public.profiles (user_id, handle, display_name)
  values (new.id, base || '-' || substr(replace(new.id::text, '-', ''), 1, 6), left(name, 40));
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── updated_at ─────────────────────────────────────────────────────────────
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger scores_touch before update on public.scores for each row execute function private.touch_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.data_versions    enable row level security;
alter table public.charts           enable row level security;
alter table public.app_meta         enable row level security;
alter table public.profiles         enable row level security;
alter table public.scores           enable row level security;
alter table public.rating_snapshots enable row level security;

-- master data: everyone reads, admins write
create policy "read all" on public.data_versions for select to anon, authenticated using (true);
create policy "admin write" on public.data_versions for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "read all" on public.charts for select to anon, authenticated using (true);
create policy "admin write" on public.charts for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "read all" on public.app_meta for select to anon, authenticated using (true);
create policy "admin write" on public.app_meta for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- profiles
create policy "own or public" on public.profiles for select to anon, authenticated
  using (is_public or user_id = (select auth.uid()));
create policy "own insert" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own update" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- scores
create policy "own or public profile" on public.scores for select to anon, authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.profiles p where p.user_id = scores.user_id and p.is_public));
create policy "own insert" on public.scores for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own update" on public.scores for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own delete" on public.scores for delete to authenticated
  using (user_id = (select auth.uid()));

-- snapshots
create policy "own or public profile" on public.rating_snapshots for select to anon, authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.profiles p where p.user_id = rating_snapshots.user_id and p.is_public));
create policy "own insert" on public.rating_snapshots for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own delete" on public.rating_snapshots for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Data API grants (tables are not exposed automatically) ────────────────
grant select on public.data_versions, public.charts, public.app_meta to anon, authenticated;
grant insert, update, delete on public.data_versions, public.charts, public.app_meta to authenticated;
grant select on public.profiles, public.scores, public.rating_snapshots to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.scores to authenticated;
grant select, insert, delete on public.rating_snapshots to authenticated;

-- ── leaderboard (public profiles, latest snapshot) ─────────────────────────
create or replace function public.leaderboard(max_rows int default 100)
returns table (handle text, display_name text, rating numeric, played int, completion_percent numeric, updated_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.handle, p.display_name, s.rating, s.played,
         case when p.show_completion then s.completion_percent end, s.created_at
  from public.profiles p
  join lateral (
    select r.rating, r.played, r.completion_percent, r.created_at
    from public.rating_snapshots r
    where r.user_id = p.user_id
    order by r.created_at desc
    limit 1
  ) s on true
  where p.is_public
  order by s.rating desc, s.created_at asc
  limit least(greatest(max_rows, 1), 500);
$$;
grant execute on function public.leaderboard(int) to anon, authenticated;
