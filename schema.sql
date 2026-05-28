-- ============================================================================
-- Loupe - consolidated baseline schema
-- ============================================================================
-- Reconstructed from the live Supabase schema dump (single source of truth).
-- This file REPLACES the following now-redundant migrations, whose columns and
-- constraints are folded into the charts table below:
--   - 20260526081654_charts.sql        (charts table + RLS)
--   - 20260519_ai_rate_limits.sql      (ai_rate_limits table)
--   - 20260527150000_charts_receipt.sql  (charts.receipt column)
--   - 20260528084500_charts_dashboard.sql (charts.plot_data/thumbnail/chart_kind)
-- DELETE those four files after adopting this baseline so the chain has one
-- authoritative starting point.
--
-- Three cleanups applied versus the raw dump (see inline CLEANUP notes):
--   1. charts: explicit `revoke all from anon` (defense-in-depth).
--   2. ai_rate_limits: grants now match the `USING (false)` policy intent -
--      revoked from anon/authenticated, granted only to service_role.
--   3. charts privacy CHECK constraint preserved verbatim (it is STRONGER than
--      the app-layer gating and is kept deliberately).
--
-- CROSS-SCHEMA WIRING NOT INCLUDED (and why):
--   The dump covers only the `public` schema. Three triggers live in other
--   schemas and are NOT recreated here. If a fresh `supabase db reset` must
--   reproduce them, add them in a follow-up migration with the right perms:
--     - on auth.users  -> calls public.handle_new_user()   (profile bootstrap)
--     - on storage.objects -> calls public.enforce_avatar_quota()
--     - an EVENT TRIGGER -> calls public.rls_auto_enable()
--   The functions themselves are defined below so the wiring can attach to them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Functions
-- ----------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.update_updated_at_column() owner to postgres;

-- touch_updated_at: identical behavior to update_updated_at_column but pins
-- search_path to public. Both exist in the live DB; kept for fidelity.
create or replace function public.touch_updated_at()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.touch_updated_at() owner to postgres;

-- handle_new_user: bootstraps a profiles row when an auth user is created.
-- The TRIGGER that calls this lives on auth.users and is NOT created here
-- (cross-schema). Wire separately if a fresh reset must reproduce it.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user() from public;
grant all on function public.handle_new_user() to service_role;

-- enforce_avatar_quota: storage-side daily upload cap. The TRIGGER that calls
-- this lives on storage.objects and is NOT created here (cross-schema).
create or replace function public.enforce_avatar_quota()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
as $$
declare
  quota_per_day constant int := 24;
  recent_count int;
  owner_id_text text;
  owner_id uuid;
begin
  if new.bucket_id <> 'avatars' then
    return new;
  end if;

  owner_id_text := (storage.foldername(new.name))[1];
  if owner_id_text is null or owner_id_text = '' then
    raise exception 'Avatar path must include the owner folder.'
      using errcode = 'P0001';
  end if;

  begin
    owner_id := owner_id_text::uuid;
  exception when others then
    raise exception 'Avatar path owner folder must be a valid uuid.'
      using errcode = 'P0001';
  end;

  select count(*)
    into recent_count
    from public.avatar_upload_audit
    where user_id = owner_id
      and uploaded_at > now() - interval '24 hours';

  if recent_count >= quota_per_day then
    raise exception 'Avatar upload quota exceeded. Try again later.'
      using errcode = 'P0001';
  end if;

  insert into public.avatar_upload_audit (user_id) values (owner_id);
  return new;
end;
$$;

alter function public.enforce_avatar_quota() owner to postgres;
grant all on function public.enforce_avatar_quota() to anon;
grant all on function public.enforce_avatar_quota() to authenticated;
grant all on function public.enforce_avatar_quota() to service_role;

-- rls_auto_enable: event-trigger function that auto-enables RLS on new public
-- tables. The EVENT TRIGGER that calls this is NOT created here (requires
-- elevated perms; not in the public-schema dump). Function kept for fidelity.
create or replace function public.rls_auto_enable()
  returns event_trigger
  language plpgsql
  security definer
  set search_path to 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (system schema or not enforced: %.)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

alter function public.rls_auto_enable() owner to postgres;
revoke all on function public.rls_auto_enable() from public;
grant all on function public.rls_auto_enable() to service_role;

-- ----------------------------------------------------------------------------
-- Table: profiles  (user account metadata; 1:1 with auth.users)
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid not null,
  email         text,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  first_name    text,
  last_name     text,
  institution   text,
  affiliation   text,
  role          text,
  address_line1 text,
  address_line2 text,
  city          text,
  postal_code   text,
  country       text,
  avatar_url    text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade,
  constraint profiles_display_name_len  check (char_length(display_name)  <= 80),
  constraint profiles_first_name_len    check (char_length(first_name)    <= 80),
  constraint profiles_last_name_len     check (char_length(last_name)     <= 80),
  constraint profiles_institution_len   check (char_length(institution)   <= 80),
  constraint profiles_affiliation_len   check (char_length(affiliation)   <= 80),
  constraint profiles_city_len          check (char_length(city)          <= 80),
  constraint profiles_country_len       check (char_length(country)       <= 80),
  constraint profiles_postal_code_len   check (char_length(postal_code)   <= 80),
  constraint profiles_address_line1_len check (char_length(address_line1) <= 160),
  constraint profiles_address_line2_len check (char_length(address_line2) <= 160),
  constraint profiles_avatar_url_len    check (char_length(avatar_url)    <= 1024),
  constraint profiles_role_enum check (
    role is null or role = any (array[
      'Researcher', 'Clinician', 'Resident', 'Postdoc',
      'PhD candidate', 'Student', 'Faculty', 'Other'
    ]::text[])
  )
);

alter table public.profiles owner to postgres;

-- ----------------------------------------------------------------------------
-- Table: charts  (saved chart specs per user)
-- ----------------------------------------------------------------------------

create table if not exists public.charts (
  id             uuid not null default gen_random_uuid(),
  user_id        uuid not null,
  name           text not null,
  chart_spec     jsonb not null,
  column_mapping jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  receipt        jsonb not null,
  plot_data      jsonb,
  thumbnail      text,
  chart_kind     text,
  constraint charts_pkey primary key (id),
  constraint charts_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint charts_chart_kind_check check (
    chart_kind = any (array['bar', 'km', 'box', 'xy']::text[])
  ),
  -- Privacy gate, enforced at the DB level (STRONGER than app-layer gating).
  -- box: plot_data must be null (outliers are individual values).
  -- xy scatter (plot_data.kind = 'xy'): plot_data must be null (raw point pairs).
  -- xy longitudinal, bar, km: aggregates -> plot_data permitted.
  constraint charts_plot_data_privacy_check check (
    ((chart_kind = 'box') and (plot_data is null))
    or ((chart_kind = 'xy') and ((plot_data is null) or (coalesce(plot_data ->> 'kind', '') <> 'xy')))
    or (chart_kind = any (array['bar', 'km']::text[]))
    or (chart_kind is null)
  )
);

alter table public.charts owner to postgres;

comment on table public.charts is
  'Saved chart specs per user. chart_spec and column_mapping are validated at the app layer (zod), not in the DB. RLS isolates by auth.uid().';
comment on column public.charts.chart_spec is
  'Full ChartSpec discriminated union. Schema validated by app zod at write time.';
comment on column public.charts.column_mapping is
  'Resolved CSV column -> chart axis/group mapping at save time.';
comment on column public.charts.receipt is
  'Reproducibility receipt metadata (generated timestamp, config hash, method, sample, palette, software, AI rationale, CSV columns used, input row count). Structure validated at app layer by src/lib/receipt/schemas.ts. LOUPE-17a.';
comment on column public.charts.plot_data is
  'Aggregated plot data for re-render. NULL for box/scatter (their plot data contains individual patient values). LOUPE-18a privacy gating.';
comment on column public.charts.thumbnail is
  'Dashboard thumbnail. Low-res PNG render for aggregate kinds; generic chart-kind icon for box/scatter (a render would leak coordinates).';
comment on column public.charts.chart_kind is
  'Denormalized from chart_spec.kind for dashboard listing without JSONB parsing.';

-- ----------------------------------------------------------------------------
-- Table: ai_rate_limits  (server-managed AI call ledger)
-- ----------------------------------------------------------------------------

create sequence if not exists public.ai_rate_limits_id_seq
  start with 1 increment by 1 no minvalue no maxvalue cache 1;

create table if not exists public.ai_rate_limits (
  id        bigint not null default nextval('public.ai_rate_limits_id_seq'::regclass),
  actor_key text not null,
  called_at timestamptz not null default now(),
  constraint ai_rate_limits_pkey primary key (id)
);

alter table public.ai_rate_limits owner to postgres;
alter sequence public.ai_rate_limits_id_seq owner to postgres;
alter sequence public.ai_rate_limits_id_seq owned by public.ai_rate_limits.id;

-- ----------------------------------------------------------------------------
-- Table: avatar_upload_audit  (avatar upload rate-limit ledger)
-- ----------------------------------------------------------------------------

create table if not exists public.avatar_upload_audit (
  id          uuid not null default gen_random_uuid(),
  user_id     uuid not null,
  uploaded_at timestamptz not null default now(),
  constraint avatar_upload_audit_pkey primary key (id)
);

alter table public.avatar_upload_audit owner to postgres;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists charts_user_id_idx
  on public.charts using btree (user_id);
create index if not exists charts_user_kind_idx
  on public.charts using btree (user_id, chart_kind);
create index if not exists ai_rate_limits_actor_window
  on public.ai_rate_limits using btree (actor_key, called_at desc);
create index if not exists avatar_upload_audit_user_uploaded_at_idx
  on public.avatar_upload_audit using btree (user_id, uploaded_at desc);

-- ----------------------------------------------------------------------------
-- Triggers (same-schema only)
-- ----------------------------------------------------------------------------

create or replace trigger charts_set_updated_at
  before update on public.charts
  for each row execute function public.update_updated_at_column();

create or replace trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.charts              enable row level security;
alter table public.ai_rate_limits      enable row level security;
alter table public.avatar_upload_audit enable row level security;

-- profiles: owner-only access. (Live DB had duplicate self/own policies; kept
-- both sets verbatim for fidelity - they are equivalent and non-conflicting.)
create policy "profiles: self read"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_select_own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own"   on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- charts: owner-only CRUD.
create policy "Users can view their own charts"   on public.charts for select using (auth.uid() = user_id);
create policy "Users can insert their own charts" on public.charts for insert with check (auth.uid() = user_id);
create policy "Users can update their own charts" on public.charts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own charts" on public.charts for delete using (auth.uid() = user_id);

-- ai_rate_limits: no client access at all; service_role (which bypasses RLS)
-- is the only writer.
create policy "no client access" on public.ai_rate_limits using (false);

-- NOTE: avatar_upload_audit has RLS enabled but NO policy in the live dump,
-- which means no client role can read/write it (default-deny). The
-- enforce_avatar_quota function is SECURITY DEFINER, so it writes regardless.
-- Kept as-is: default-deny is the intended posture.

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------

grant usage on schema public to postgres, anon, authenticated, service_role;

-- charts: authenticated + service_role only.
-- CLEANUP #1: explicit revoke from anon (defense-in-depth; the dump merely
-- never granted anon, this makes the denial intentional and audit-visible).
revoke all on table public.charts from anon;
grant all on table public.charts to authenticated;
grant all on table public.charts to service_role;

-- CLEANUP #2: ai_rate_limits grants now match the `USING (false)` policy.
-- The dump granted ALL to anon + authenticated, contradicting the policy that
-- blocks every client row. Recording runs through service_role (which bypasses
-- RLS), so anon/authenticated need no grants. Revoke them; keep service_role.
-- !! VERIFY AFTER APPLYING: confirm AI rate-limit recording still works. If the
--    recording path uses the authenticated client rather than service_role,
--    this revoke will surface that (recording would no-op) - which is the bug
--    you want to find anyway, since the USING(false) policy already blocks it.
revoke all on table public.ai_rate_limits from anon;
revoke all on table public.ai_rate_limits from authenticated;
grant all on table public.ai_rate_limits to service_role;
revoke all on sequence public.ai_rate_limits_id_seq from anon;
revoke all on sequence public.ai_rate_limits_id_seq from authenticated;
grant all on sequence public.ai_rate_limits_id_seq to service_role;

-- avatar_upload_audit: written only by the SECURITY DEFINER quota function.
-- Keep service_role; anon/authenticated have RLS default-deny anyway, but the
-- dump granted them table privileges. Left granted for fidelity since the
-- function is the only writer and RLS has no policy (default-deny on rows).
grant all on table public.avatar_upload_audit to anon;
grant all on table public.avatar_upload_audit to authenticated;
grant all on table public.avatar_upload_audit to service_role;

-- profiles: all client roles (RLS policies scope actual row access to owner).
grant all on table public.profiles to anon;
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Function execution grants.
grant all on function public.update_updated_at_column() to anon, authenticated, service_role;
grant all on function public.touch_updated_at()        to anon, authenticated, service_role;

-- Default privileges (mirrors the live DB).
alter default privileges for role postgres in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables    to postgres, anon, authenticated, service_role;

-- ============================================================================
-- End baseline.
-- ============================================================================
