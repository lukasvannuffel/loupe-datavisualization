/**
 * Linear-interpolation percentile (numpy.percentile / matplotlib / R type=7
 * default). For a sorted array of length n and probability p ∈ [0, 1]:
 *   h = (n − 1) × p
 *   Q = x[⌊h⌋] + (h − ⌊h⌋) × (x[⌈h⌉] − x[⌊h⌋])
 *
 * This is NOT R's boxplot() convention (which uses Tukey hinges via fivenum,
 * roughly type=2). The two diverge by ~1% at small n (n<10). We chose type=7
 * because it matches the modern Python/JS stats stack and is the documented
 * default in numpy, pandas, matplotlib, and ggplot2. The "quartiles" label
 * in the UI refers to this algorithm — see CLAUDE.md on label/math matching.
 *
 * Caller MUST pass a sorted array. We do not sort defensively; the aggregator
 * sorts once per group and reuses for q1/median/q3.
 */
export const percentileType7 = (sortedAsc: readonly number[], p: number): number => {
    const n = sortedAsc.length;
    if (n === 0 || !Number.isFinite(p) || p < 0 || p > 1) {
        return Number.NaN;
    }
    if (n === 1) {
        return sortedAsc[0]!;
    }

    const h = (n - 1) * p;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    if (lo === hi) {
        return sortedAsc[lo]!;
    }

    const frac = h - lo;

    return sortedAsc[lo]! + frac * (sortedAsc[hi]! - sortedAsc[lo]!);
};
