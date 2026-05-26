-- Manual RLS verification for public.charts (LOUPE-16).
-- NOT a migration — do not place under supabase/migrations/.
--
-- Run in Supabase SQL Editor (default role: postgres).
--
-- Prerequisite: alice@test.local and bob@test.local in auth.users
--   (Authentication → Users → Add user, Auto Confirm).

begin;

-- =============================================================================
-- 1. Optional seed (only when email does not exist yet)
-- =============================================================================
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  v.id,
  'authenticated',
  'authenticated',
  v.email,
  crypt('loupe-test-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'alice@test.local'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'bob@test.local')
) as v(id, email)
where not exists (
  select 1 from auth.users u where u.email = v.email
);

-- =============================================================================
-- 2. Resolve ids into session config (while still postgres — before SET ROLE)
-- =============================================================================
select set_config(
  'app.rls_test.alice_id',
  (select id::text from auth.users where email = 'alice@test.local'),
  true
);
select set_config(
  'app.rls_test.bob_id',
  (select id::text from auth.users where email = 'bob@test.local'),
  true
);

do $$
begin
  if current_setting('app.rls_test.alice_id', true) is null
     or current_setting('app.rls_test.bob_id', true) is null then
    raise exception
      'Need alice@test.local and bob@test.local in auth.users. '
      'Create them in Authentication → Users (Auto Confirm), then re-run.';
  end if;
end;
$$;

-- =============================================================================
-- 3. RLS tests (simulate JWT; ids read from session config, not temp tables)
-- =============================================================================

-- As Alice:
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('app.rls_test.alice_id', true), true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.charts (user_id, name, chart_spec, column_mapping)
values (
  current_setting('app.rls_test.alice_id', true)::uuid,
  'Alice''s KM chart',
  '{"kind":"km","mapping":{}}'::jsonb,
  '{"time":"days","event":"died","group":"arm"}'::jsonb
);

-- Alice can see her own (expect: 1):
select count(*) as alice_sees_own from public.charts;

-- Switch to Bob:
select set_config('request.jwt.claim.sub', current_setting('app.rls_test.bob_id', true), true);

-- Bob cannot see Alice's chart (expect: 0):
select count(*) as bob_sees_alice from public.charts;

-- Bob cannot update Alice's chart (expect: 0 rows):
update public.charts
  set name = 'Bob hijack'
  where name = 'Alice''s KM chart';

-- Bob cannot insert under Alice's user_id (expect: policy violation):
do $$
declare
  alice_id uuid := current_setting('app.rls_test.alice_id', true)::uuid;
begin
  insert into public.charts (user_id, name, chart_spec, column_mapping)
  values (
    alice_id,
    'Bob impersonates Alice',
    '{}'::jsonb,
    '{}'::jsonb
  );
  raise exception 'FAIL: Bob was allowed to insert as Alice';
exception
  when others then
    raise notice 'OK: Bob insert blocked — %', sqlerrm;
end;
$$;

-- As anon (expect: permission denied):
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
do $$
begin
  perform count(*) from public.charts;
  raise exception 'FAIL: anon was allowed to select from charts';
exception
  when insufficient_privilege then
    raise notice 'OK: anon select denied';
end;
$$;

-- Discard test chart row(s):
rollback;

-- Show resolved ids (run separately if needed):
-- select id, email from auth.users where email in ('alice@test.local', 'bob@test.local');
