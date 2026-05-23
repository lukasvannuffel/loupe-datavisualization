/**
 * Greenwood-formula 95% confidence interval for S(t) using the log-log
 * transformation. The transform guarantees CI ⊂ [0, 1] at the tails.
 *
 * Uses z = 1.960 (normal approximation). This is the standard for survival
 * analysis (delta method) — NOT Student's t. Do not "fix" to use tCritical():
 * the asymptotic distribution here is normal, not t.
 *
 * cumGreenwoodSum = Σ d_i / (n_i × (n_i − d_i)) over event times ≤ t.
 *
 * Returns { lower: NaN, upper: NaN } when S=1 or S=0 (log(0) undefined).
 * Callers should clamp or hide the band at those points.
 */
const Z_95 = 1.960;

export function logLogCI(
    survival: number,
    cumGreenwoodSum: number,
): { readonly lower: number; readonly upper: number } {
    if (survival <= 0 || survival >= 1) {
        return { lower: Number.NaN, upper: Number.NaN };
    }

    const logS = Math.log(survival);
    const varG = cumGreenwoodSum / (logS * logS);
    const se = Math.sqrt(varG);
  // g(S) = log(-log S). Back-transform: S^exp(±z·se).
    const lower = Math.pow(survival, Math.exp(Z_95 * se));
    const upper = Math.pow(survival, Math.exp(-Z_95 * se));

    return { lower, upper };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** KM point CI with all-censored collapse and [0,1] clamping. */
export function kmPointCI(
    survival: number,
    cumGreenwoodSum: number,
): { readonly lower: number; readonly upper: number } {
    if (survival === 1 && cumGreenwoodSum === 0) {
        return { lower: 1, upper: 1 };
    }
    const { lower, upper } = logLogCI(survival, cumGreenwoodSum);
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
        return { lower: Number.NaN, upper: Number.NaN };
    }
    return { lower: clamp01(lower), upper: clamp01(upper) };
}
