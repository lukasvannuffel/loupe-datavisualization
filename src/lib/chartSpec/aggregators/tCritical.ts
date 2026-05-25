/**
 * Two-sided 95% critical value of Student's t-distribution.
 *
 * Returns t(0.975, df) for df ∈ [1, 60] from a hand-rolled table (two-decimal
 * precision, sourced from R's qt(0.975, df)). For df > 60 returns the normal
 * approximation 1.960; absolute error < 0.04 for df > 60 (~2% relative error
 * on the half-width — acceptable for clinical sample sizes).
 *
 * If higher precision is needed downstream, replace with
 * jStat.studentt.inv(0.975, df).
 */
const T_TABLE_975: readonly number[] = [
    12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
    2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086,
    2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045,
    2.042, 2.04, 2.037, 2.035, 2.032, 2.03, 2.028, 2.026, 2.024, 2.023,
    2.021, 2.02, 2.018, 2.017, 2.015, 2.014, 2.013, 2.012, 2.011, 2.01,
    2.009, 2.008, 2.007, 2.006, 2.005, 2.004, 2.003, 2.002, 2.002, 2.001,
    2.0,
] as const;

export const tCritical = (df: number): number => {
    if (df < 1 || !Number.isFinite(df)) {
        return Number.NaN;
    }
    if (df > 60) {
        return 1.96;
    }

    return T_TABLE_975[df - 1] ?? Number.NaN;
};
