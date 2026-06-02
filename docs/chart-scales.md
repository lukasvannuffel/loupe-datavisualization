# Chart Scale Rules

Per-chart domain logic and rationale for scale behavior.

## Kaplan-Meier
- Y-axis is always `[0, 1]` (hardcoded invariant).
- Rationale: survival probability is bounded; dynamic y-scaling would overstate small visual differences.
- Witness coverage: `src/components/charts/d3/__tests__/KaplanMeierChart.scale.test.tsx`.

## Bar Chart With Error Bars
- Y-axis is built from `[min(0, mean-error), max(0, mean+error)]`, then padded (`-5%`, `+10%`) and `.nice()`.
- Zero is always part of the pre-padding domain construction, preserving baseline interpretation for effect direction.
- `n=1` groups suppress error segments while preserving a finite, non-degenerate scale.
- Witness coverage: `src/components/charts/d3/__tests__/BarErrorChart.scale.test.tsx`.

## XY Plot
- X and Y domains use data extents with `+/-5%` padding, then `.nice()`.
- No forced zero baseline is applied.
- Rationale: forced zero distorts correlation and longitudinal trend interpretation.
- A span guard (`Math.max(span, 1e-6)`) prevents degenerate domains for constant-valued axes.
- Witness coverage: `src/components/charts/d3/__tests__/XYChart.scale.test.tsx`.

## Box Plot
- Y-axis uses full aggregated extent (`yMin..yMax`) with `+/-5%` padding, then `.nice()`.
- Outliers must remain in-domain and visible; clipping outliers distorts distribution reading.
- Low-variance groups are protected from zero-width domains via the span guard and `.nice()`.
- Witness coverage: `src/components/charts/d3/__tests__/BoxChart.scale.test.tsx`.

## Testing
- Witness tests live in `src/components/charts/d3/__tests__/*.scale.test.tsx`.
- Mutation-verify logs are embedded in each scale test file.
