-- Only run against an isolated LOCAL PostgreSQL database named awds_access_test.
-- Stubs Supabase Auth claims; does not test email delivery or the hosted Auth service.
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'awds_access_test' then raise exception 'Use the isolated awds_access_test database only'; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
create or replace function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims', true)::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
\ir ../src/academy/supabase/schema.sql
truncate public.awds_docs, public.awds_admins, auth.users;
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001', 'thanfo@gmail.com', now()),
 ('00000000-0000-0000-0000-000000000002', 'trainee-a@example.test', now()),
 ('00000000-0000-0000-0000-000000000003', 'trainee-b@example.test', now()),
 ('00000000-0000-0000-0000-000000000004', 'outsider@example.test', now());
\ir ../src/academy/supabase/bootstrap-admin.sql
insert into public.awds_docs (path, data) values
 ('enrol/hash-a', '{"cohort":"A"}'), ('enrol/hash-b', '{"cohort":"B"}'),
 ('codes/a', '{"email":"trainee-a@example.test","code":"AWDS-AAAA-AAAA","hash":"hash-a","cohort":"A"}'),
 ('codes/b', '{"email":"trainee-b@example.test","code":"AWDS-BBBB-BBBB","hash":"hash-b","cohort":"B"}'),
 ('profiles/00000000-0000-0000-0000-000000000003', '{"enrolHash":"hash-b","cohort":"B"}'),
 ('progress/00000000-0000-0000-0000-000000000003', '{"units":{}}'),
 ('board/00000000-0000-0000-0000-000000000003', '{"cohort":"B"}');
create or replace function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
create or replace function pg_temp.denied(statement text, label text) returns void language plpgsql as $$
begin
  begin execute statement; exception when insufficient_privilege then raise notice 'PASS: %', label; return; end;
  raise exception 'FAIL: % was allowed', label;
end $$;

set role anon;
select pg_temp.check_true(public.awds_check_code('TRAINEE-A@example.test','awds aaaa aaaa'), 'invited email and normalized code accepted');
select pg_temp.check_true(not public.awds_check_code('outsider@example.test','AWDS-AAAA-AAAA'), 'code cannot be used by another email');
select pg_temp.denied('select * from public.awds_docs', 'anonymous data access denied');
reset role;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","email":"trainee-a@example.test"}';
set role authenticated;
select pg_temp.check_true(not public.awds_is_admin(), 'trainee cannot become admin');
select pg_temp.check_true((select count(*) = 1 from public.awds_docs), 'trainee sees only their invitation before onboarding');
select pg_temp.denied('insert into public.awds_docs(path,data) values (''profiles/00000000-0000-0000-0000-000000000002'',''{"cohort":"B","enrolHash":"hash-b"}'')', 'another invitation cannot be claimed');
select pg_temp.denied('insert into public.awds_docs(path,data) values (''profiles/00000000-0000-0000-0000-000000000002'',''{"cohort":"B","enrolHash":"hash-a"}'')', 'cohort cannot be forged');
insert into public.awds_docs(path,data) values ('profiles/00000000-0000-0000-0000-000000000002','{"cohort":"A","enrolHash":"hash-a"}');
insert into public.awds_docs(path,data) values ('progress/00000000-0000-0000-0000-000000000002','{"units":{}}');
update public.awds_docs set data = '{"units":{"lesson":1}}' where path = 'progress/00000000-0000-0000-0000-000000000002';
insert into public.awds_docs(path,data) values ('board/00000000-0000-0000-0000-000000000002','{"cohort":"A"}');
select pg_temp.check_true((select data -> 'units' ->> 'lesson' = '1' from public.awds_docs where coll = 'progress'), 'own progress saves and reloads');
select pg_temp.check_true((select count(*) = 0 from public.awds_docs where doc_id = '00000000-0000-0000-0000-000000000003'), 'other trainee records and cohort board hidden');
select pg_temp.check_true((select count(*) = 0 from public.awds_docs where coll = 'codes'), 'invitation directory hidden');
select pg_temp.denied('update public.awds_docs set data = ''{"cohort":"B"}'' where coll = ''board''', 'board cohort cannot be forged');
select pg_temp.denied('insert into public.awds_admins values (''00000000-0000-0000-0000-000000000002'')', 'admin self-promotion denied');
select pg_temp.denied('insert into public.awds_docs(path,data) values (''codes/evil'',''{}'')', 'trainee invitation creation denied');
with changed as (update public.awds_docs set data = '{}' where doc_id = '00000000-0000-0000-0000-000000000003' returning *) select pg_temp.check_true(count(*) = 0, 'other user updates denied') from changed;
reset role;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004","email":"outsider@example.test"}';
set role authenticated;
select pg_temp.check_true((select count(*) = 0 from public.awds_docs), 'uninvited account sees no trainee data');
select pg_temp.denied('insert into public.awds_docs(path,data) values (''progress/00000000-0000-0000-0000-000000000004'',''{}'')', 'uninvited account cannot write');
reset role;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"thanfo@gmail.com"}';
set role authenticated;
select pg_temp.check_true(public.awds_is_admin(), 'designated administrator recognized');
select pg_temp.check_true((select count(*) = 2 from public.awds_docs where coll = 'profiles'), 'admin sees both trainee profiles');
delete from public.awds_docs where path = 'enrol/hash-a';
reset role;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","email":"trainee-a@example.test"}';
set role authenticated;
select pg_temp.check_true((select count(*) = 0 from public.awds_docs), 'revocation removes trainee access');
select pg_temp.check_true(not public.awds_check_code('trainee-a@example.test','AWDS-AAAA-AAAA'), 'revoked code rejected');
reset role;
select 'Academy database access checks passed' as result;
