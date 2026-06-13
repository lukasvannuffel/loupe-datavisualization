create table public.palettes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  colors     jsonb not null,
  created_at timestamptz default now()
);

alter table public.palettes enable row level security;

create policy "users manage own palettes"
  on public.palettes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index palettes_user_id_idx on public.palettes(user_id);

-- Artevelde Hogeschool brand palette (jury demo — insert manually via dashboard):
-- #F37021, #7DBB42, #009FE3, #000000
