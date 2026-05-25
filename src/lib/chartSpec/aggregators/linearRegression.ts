import type { RegressionResult } from "./xyPlot.types";

/**
 * Ordinary least squares fit for a set of (x, y) points.
 *
 * Returns slope, intercept, and r² (coefficient of determination).
 *
 * Skip threshold: n < 3. Rationale:
 *   - n=1: no line defined.
 *   - n=2: line defined exactly with r²=1 and zero residual — mathematically
 *          valid but inferentially meaningless (no degree of freedom for error).
 *   - n=3: minimum where OLS produces a non-degenerate fit with at least one
 *          degree of freedom for residual.
 *
 * When skipped, returns null. Callers MUST handle the null case.
 *
 * Algorithm: closed-form, no matrix operations. Anchored against
 * scipy.stats.linregress; tolerance ±0.001.
 *
 * Edge cases by design:
 *   - n < 3 → null (insufficient degrees of freedom for residual variance)
 *   - vertical line (all x identical, ssX = 0) → null (OLS undefined)
 *   - horizontal line (all y identical, ssY = 0) → { slope: 0, intercept: ȳ, r²: 1 }
 *     Note: scipy.stats.linregress returns rvalue=nan in this case. Loupe
 *     returns r²=1 because the line of best fit IS perfectly defined
 *     (y = mean, with zero residual). This is a documentation-honest
 *     deviation from scipy — the regression is degenerate but well-defined.
 */
export const computeLinearRegression = (
    points: readonly { readonly x: number; readonly y: number }[],
): RegressionResult | null => {
    if (points.length < 3) {
        return null;
    }

    const n = points.length;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let ssX = 0;
    let ssXY = 0;
    let ssY = 0;
    for (const p of points) {
        const dx = p.x - meanX;
        const dy = p.y - meanY;
        ssX += dx * dx;
        ssXY += dx * dy;
        ssY += dy * dy;
    }

    if (ssX === 0) {
        return null;
    }

    const slope = ssXY / ssX;
    const intercept = meanY - slope * meanX;
    const r2 = ssY === 0 ? 1 : (ssXY * ssXY) / (ssX * ssY);

    return { slope, intercept, r2 };
};
