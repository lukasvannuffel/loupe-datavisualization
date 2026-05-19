-- AI recommendation rate limiting (LOUPE-09).
-- Server-only: accessed via SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Clients (anon/authenticated) cannot read or write this table.

create table if not exists public.ai_rate_limits (
  id bigserial primary key,
  actor_key text not null,
  called_at timestamptz not null default now()
);

create index if not exists ai_rate_limits_actor_window
  on public.ai_rate_limits (actor_key, called_at desc);

alter table public.ai_rate_limits enable row level security;

create policy "no client access" on public.ai_rate_limits
  for all
  using (false);
