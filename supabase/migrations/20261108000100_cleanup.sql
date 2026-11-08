-- Not yet applied to the hosted project (destructive statements need dashboard confirmation).
-- Run once in the Supabase SQL editor.

-- 1) Remove the one-time seeding helpers (EXECUTE is already revoked from every API role).
drop function if exists public.seed_master(text, jsonb, jsonb, jsonb);
drop function if exists public.seed_master_v2(text, jsonb, jsonb, jsonb);
drop table if exists private.seed_token;

-- 2) Split admin "for all" policies so SELECT is evaluated by one permissive policy only
--    (advisor: multiple_permissive_policies).
drop policy if exists "admin write" on public.data_versions;
drop policy if exists "admin write" on public.charts;
drop policy if exists "admin write" on public.app_meta;
create policy "admin insert" on public.data_versions for insert to authenticated with check ((select private.is_admin()));
create policy "admin update" on public.data_versions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete" on public.data_versions for delete to authenticated using ((select private.is_admin()));
create policy "admin insert" on public.charts for insert to authenticated with check ((select private.is_admin()));
create policy "admin update" on public.charts for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete" on public.charts for delete to authenticated using ((select private.is_admin()));
create policy "admin insert" on public.app_meta for insert to authenticated with check ((select private.is_admin()));
create policy "admin update" on public.app_meta for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete" on public.app_meta for delete to authenticated using ((select private.is_admin()));
