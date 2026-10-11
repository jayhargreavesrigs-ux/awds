-- AWDS Academy — Supabase schema. Run once in Supabase: SQL Editor → New query → paste → Run.
-- Then create your administrator account and run bootstrap-admin.sql.
begin;

-- Internal permission checks are not exposed as Data API endpoints.
create schema if not exists awds_private;
revoke all on schema awds_private from public, anon, authenticated;
grant usage on schema awds_private to anon, authenticated;

create table if not exists public.awds_docs (
  path text primary key check (path ~ '^(progress|profiles|board|enrol|codes)/[A-Za-z0-9_-]{1,80}$'),
  coll text not null generated always as (split_part(path, '/', 1)) stored,
  doc_id text not null generated always as (split_part(path, '/', 2)) stored,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists awds_docs_coll on public.awds_docs (coll);

create table if not exists public.awds_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.awds_docs enable row level security;
alter table public.awds_admins enable row level security;

-- helpers (security definer so they can look across rows the caller cannot see)
create or replace function awds_private.awds_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.awds_admins where user_id = auth.uid());
$$;

-- Bind every invitation to the authenticated email; knowing another code is not enough.
create or replace function awds_private.awds_owns_invitation(p_hash text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.awds_docs c join public.awds_docs e
      on e.path = 'enrol/' || (c.data ->> 'hash')
    where c.coll = 'codes' and c.data ->> 'hash' = p_hash
      and auth.uid() is not null
      and lower(c.data ->> 'email') = lower(auth.jwt() ->> 'email'));
$$;

create or replace function awds_private.awds_valid_profile(p_data jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and awds_private.awds_owns_invitation(p_data ->> 'enrolHash') and exists (
    select 1 from public.awds_docs e
    where e.path = 'enrol/' || (p_data ->> 'enrolHash')
      and e.data ->> 'cohort' = p_data ->> 'cohort');
$$;

create or replace function awds_private.awds_my_cohort() returns text
language sql stable security definer set search_path = '' as $$
  select p.data ->> 'cohort' from public.awds_docs p
  where auth.uid() is not null and p.path = 'profiles/' || auth.uid()::text
    and awds_private.awds_valid_profile(p.data);
$$;

create or replace function awds_private.awds_is_enrolled() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.awds_docs c
    where c.coll = 'codes' and auth.uid() is not null
      and lower(c.data ->> 'email') = lower(coalesce(auth.jwt() ->> 'email', ''))
      and exists (select 1 from public.awds_docs e where e.path = 'enrol/' || (c.data ->> 'hash')));
$$;

-- Intentional pre-authentication check: returns only whether the supplied
-- email AND access code match. No invitation details are returned.
create or replace function awds_private.awds_check_code(p_email text, p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.awds_docs c
    where c.coll = 'codes'
      and lower(c.data ->> 'email') = lower(trim(p_email))
      and regexp_replace(upper(c.data ->> 'code'), '[^A-Z0-9]', '', 'g') = regexp_replace(upper(p_code), '[^A-Z0-9]', '', 'g')
      and exists (select 1 from public.awds_docs e where e.path = 'enrol/' || (c.data ->> 'hash')));
$$;

revoke all on function awds_private.awds_check_code(text, text) from public, anon, authenticated;
revoke all on function awds_private.awds_is_admin(), awds_private.awds_is_enrolled(), awds_private.awds_owns_invitation(text), awds_private.awds_valid_profile(jsonb), awds_private.awds_my_cohort() from public, anon, authenticated;
grant execute on function awds_private.awds_check_code(text, text) to anon, authenticated;
grant execute on function awds_private.awds_is_admin() to authenticated;
grant execute on function awds_private.awds_is_enrolled() to authenticated;
grant execute on function awds_private.awds_owns_invitation(text), awds_private.awds_valid_profile(jsonb), awds_private.awds_my_cohort() to authenticated;
-- Narrow public API wrappers run with the caller's permissions.
create or replace function public.awds_is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select awds_private.awds_is_admin();
$$;
create or replace function public.awds_is_enrolled() returns boolean
language sql stable security invoker set search_path = '' as $$
  select awds_private.awds_is_enrolled();
$$;
create or replace function public.awds_check_code(p_email text, p_code text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select awds_private.awds_check_code(p_email, p_code);
$$;
revoke all on function public.awds_is_admin(), public.awds_is_enrolled(), public.awds_check_code(text, text) from public, anon, authenticated;
grant execute on function public.awds_is_admin(), public.awds_is_enrolled() to authenticated;
grant execute on function public.awds_check_code(text, text) to anon, authenticated;
revoke all on public.awds_docs, public.awds_admins from public, anon, authenticated;
grant select, insert, update, delete on public.awds_docs to authenticated;
grant select on public.awds_admins to authenticated;

-- Access rules (same as the PHP version):
--   progress/<uid>, profiles/<uid> : owner reads and writes; admins read all
--   board/<uid>                    : same-cohort trainees and admins read; owner writes
--   enrol/<hash>                   : invited email and admins read; admins write
--   codes/<id>                     : admins only
drop policy if exists awds_read on public.awds_docs;
create policy awds_read on public.awds_docs for select to authenticated using (
  (select awds_private.awds_is_admin())
  or (coll = 'profiles' and doc_id = (select auth.uid())::text and awds_private.awds_valid_profile(data))
  or (coll = 'progress' and doc_id = (select auth.uid())::text and (select awds_private.awds_my_cohort()) is not null)
  or (coll = 'board' and data ->> 'cohort' = (select awds_private.awds_my_cohort()))
  or (coll = 'enrol' and awds_private.awds_owns_invitation(doc_id))
);
drop policy if exists awds_insert on public.awds_docs;
create policy awds_insert on public.awds_docs for insert to authenticated with check (
  (doc_id = (select auth.uid())::text and (
    (coll = 'progress' and ((select awds_private.awds_my_cohort()) is not null or (select awds_private.awds_is_admin())))
    or (coll = 'profiles' and awds_private.awds_valid_profile(data))
    or (coll = 'board' and data ->> 'cohort' = (select awds_private.awds_my_cohort()))))
  or (coll in ('enrol', 'codes') and (select awds_private.awds_is_admin()))
);
drop policy if exists awds_update on public.awds_docs;
create policy awds_update on public.awds_docs for update to authenticated using (
  (coll in ('progress', 'profiles', 'board') and doc_id = (select auth.uid())::text)
  or (coll in ('enrol', 'codes') and (select awds_private.awds_is_admin()))
) with check (
  (doc_id = (select auth.uid())::text and (
    (coll = 'progress' and ((select awds_private.awds_my_cohort()) is not null or (select awds_private.awds_is_admin())))
    or (coll = 'profiles' and awds_private.awds_valid_profile(data))
    or (coll = 'board' and data ->> 'cohort' = (select awds_private.awds_my_cohort()))))
  or (coll in ('enrol', 'codes') and (select awds_private.awds_is_admin()))
);
drop policy if exists awds_delete on public.awds_docs;
create policy awds_delete on public.awds_docs for delete to authenticated using (
  coll in ('enrol', 'codes') and (select awds_private.awds_is_admin())
);
drop policy if exists awds_admins_self on public.awds_admins;
create policy awds_admins_self on public.awds_admins for select to authenticated using (user_id = (select auth.uid()));

-- Remove obsolete public helpers when upgrading an earlier installation.
drop function if exists public.awds_owns_invitation(text);
drop function if exists public.awds_valid_profile(jsonb);
drop function if exists public.awds_my_cohort();

commit;
