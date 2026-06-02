<!--
LOUPE-31 audit notes (working scratch file)

KaplanMeierChart

Domain rule: y-domain is hardcoded to [0, 1]; x-domain is [0, data.tMax].
Edge case: all survival = 1 (no events) -> y-domain remains [0, 1]; curve stays flat at 1.
Edge case: survival reaches 0 before t_max -> y-domain remains [0, 1]; curve can touch y=0 without rescaling.
Defects found: none.

BarErrorChart

Domain rule: [min(0, mean-err), max(0, mean+err)] with span floor 1e-6, then 5% lower / 10% upper padding, then .nice().
Edge case: all-negative groups -> domain[1] stays >= 0 by explicit max(0, ...), preserving zero as upper bound.
Edge case: all-constant values -> span floor + .nice() prevent a zero-width scale.
Edge case: n=1 group -> computeErrorBar(...) is 0, so error segments are skipped and domain math remains finite.
Defects found: none.

XYChart

Domain rule: x and y domains use extents +/- 5% padding with span floor 1e-6, then .nice(); no forced zero baseline.
Edge case: all x-values identical -> xSpan guard (Math.max(xMax - xMin, 1e-6)) prevents degenerate x-domain.
Edge case: two points -> finite padded extents + .nice() produce readable non-degenerate domains.
Defects found: none.

BoxChart

Domain rule: y-domain uses [yMin - 5%*span, yMax + 5%*span] with span floor 1e-6, then .nice().
Edge case: outliers far outside IQR -> domain derives from aggregated yMin/yMax (which include outlier extent), so outliers are not clipped.
Edge case: single group, low variance -> span floor + .nice() avoid zero-width y-domain.
Defects found: none.

Coverage ledger (all 9 ticket edge cases)

1) KM all survival=1 -> covered by test (KaplanMeierChart.scale.test.tsx)
2) KM reaches 0 before t_max -> covered by test (KaplanMeierChart.scale.test.tsx)
3) BarError all-negative groups -> covered by test (BarErrorChart.scale.test.tsx)
4) BarError all-constant values -> covered by test (BarErrorChart.scale.test.tsx)
5) BarError n=1 -> covered by test (BarErrorChart.scale.test.tsx)
6) XY identical x values -> covered by test (XYChart.scale.test.tsx)
7) XY two points -> covered by test (XYChart.scale.test.tsx)
8) Box far outliers -> covered by test (BoxChart.scale.test.tsx)
9) Box single-group low variance -> covered by test (BoxChart.scale.test.tsx)
-->
