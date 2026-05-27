-- Migration: add receipt column to public.charts.
-- LOUPE-17a. Additive; depends on LOUPE-16 migration.

alter table public.charts
  add column receipt jsonb default '{}'::jsonb;

alter table public.charts
  alter column receipt set not null;

alter table public.charts
  alter column receipt drop default;

comment on column public.charts.receipt is
  'Reproducibility receipt metadata (generated timestamp, config hash, method, sample, palette, software, AI rationale, CSV columns used, input row count). Structure is validated at app layer by src/lib/receipt/schemas.ts. LOUPE-17a.';
