-- Migration: create public.charts table with RLS isolation.
-- LOUPE-16. Depends on Supabase auth schema being initialized.

-- 1. The updated_at trigger function (idempotent — reuse if it exists).
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. The charts table.
create table public.charts (
  id              uuid          primary key default gen_random_uuid(),
  user_id         uuid          not null references auth.users(id) on delete cascade,
  name            text          not null,
  chart_spec      jsonb         not null,
  column_mapping  jsonb         not null,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- 3. Index supporting the dashboard query (user_id = auth.uid()).
create index charts_user_id_idx on public.charts (user_id);

-- 4. updated_at trigger.
create trigger charts_set_updated_at
  before update on public.charts
  for each row
  execute function public.update_updated_at_column();

-- 5. Row-level security.
alter table public.charts enable row level security;

-- One policy per CRUD operation. auth.uid() must match the row's user_id.
create policy "Users can view their own charts"
  on public.charts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own charts"
  on public.charts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own charts"
  on public.charts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own charts"
  on public.charts for delete
  using (auth.uid() = user_id);

-- 6. Defense-in-depth: role-level grants. RLS policies are the perimeter;
--    these grants are the gate. anon is explicitly denied; authenticated
--    can perform CRUD but only on rows that pass the policies above.
revoke all on public.charts from anon;
grant select, insert, update, delete on public.charts to authenticated;

-- 7. Schema documentation.
comment on table public.charts is
  'Saved chart specs per user. chart_spec and column_mapping are validated at the app layer (zod), not in the DB. RLS isolates by auth.uid().';
comment on column public.charts.chart_spec is
  'Full ChartSpec discriminated union. Schema validated by app zod at write time.';
comment on column public.charts.column_mapping is
  'Resolved CSV column → chart axis/group mapping at save time.';
