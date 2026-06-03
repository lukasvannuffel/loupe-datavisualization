ALTER TABLE public.charts
  ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.charts.tags IS
  'User-defined tags as a JSON array of lowercase strings. V1 grouping mechanism.';
