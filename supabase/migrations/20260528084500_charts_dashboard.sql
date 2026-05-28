-- LOUPE-18a: dashboard support columns.
alter table public.charts add column plot_data jsonb;
alter table public.charts add column thumbnail text;
alter table public.charts add column chart_kind text;

-- chart_kind constrained to known dashboard kinds.
alter table public.charts
  add constraint charts_chart_kind_check
  check (chart_kind in ('bar', 'km', 'box', 'xy'));

alter table public.charts
  add constraint charts_plot_data_privacy_check
  check (
    (chart_kind = 'box' and plot_data is null)
    or (chart_kind = 'xy' and (plot_data is null or coalesce(plot_data->>'kind', '') <> 'xy'))
    or (chart_kind in ('bar', 'km'))
    or chart_kind is null
  );

update public.charts
set chart_kind = case chart_spec->>'kind'
  when 'barError' then 'bar'
  else chart_spec->>'kind'
end
where chart_kind is null;

create index charts_user_kind_idx on public.charts (user_id, chart_kind);

comment on column public.charts.plot_data is
  'Aggregated plot data for re-render. NULL for box/scatter (their plot data contains individual patient values). LOUPE-18a privacy gating.';
comment on column public.charts.thumbnail is
  'Dashboard thumbnail. Low-res PNG render for aggregate kinds; generic chart-kind icon for box/scatter (a render would leak coordinates).';
comment on column public.charts.chart_kind is
  'Denormalized from chart_spec.kind for dashboard listing without JSONB parsing.';
