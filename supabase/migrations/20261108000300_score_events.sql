-- Score history: one row each time a chart's score goes up or its lamp changes.
-- Written only by the trigger on public.scores; clients read it.

create table public.score_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  chart_id   text not null references public.charts(id) on update cascade,
  score      int  not null,
  prev_score int,
  lamp       text not null,
  prev_lamp  text,
  created_at timestamptz not null default now()
);
create index score_events_user_created_idx on public.score_events (user_id, created_at desc);
create index score_events_user_chart_idx on public.score_events (user_id, chart_id, created_at desc);
create index score_events_chart_id_idx on public.score_events (chart_id);

alter table public.score_events enable row level security;

create policy "own or public profile" on public.score_events for select to anon, authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.profiles p where p.user_id = score_events.user_id and p.is_public));

grant select on public.score_events to anon, authenticated;

create or replace function private.log_score_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.score > old.score
     or new.lamp is distinct from old.lamp then
    insert into public.score_events (user_id, chart_id, score, prev_score, lamp, prev_lamp)
    values (
      new.user_id, new.chart_id, new.score,
      case when tg_op = 'UPDATE' then old.score end,
      new.lamp,
      case when tg_op = 'UPDATE' then old.lamp end
    );
  end if;
  return null;
end;
$$;
revoke execute on function private.log_score_event() from public, anon, authenticated;

create trigger scores_log_event
  after insert or update of score, lamp on public.scores
  for each row execute function private.log_score_event();

-- Existing scores become their first event, dated when they were last saved.
insert into public.score_events (user_id, chart_id, score, prev_score, lamp, prev_lamp, created_at)
select user_id, chart_id, score, null, lamp, null, updated_at from public.scores;

-- "모든 점수 삭제" also clears the history.
create policy "own delete" on public.score_events for delete to authenticated
  using (user_id = (select auth.uid()));
grant delete on public.score_events to authenticated;
