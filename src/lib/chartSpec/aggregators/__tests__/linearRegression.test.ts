import { describe, expect, it } from "vitest";

import { computeLinearRegression } from "../linearRegression";

// Anchors verified against scipy.stats.linregress:
//   >>> from scipy import stats
//   >>> import numpy as np
//   >>> x = np.array([1, 2, 3, 4, 5])
//   >>> y = np.array([2, 4, 5, 4, 5])
//   >>> r = stats.linregress(x, y)
//   >>> r.slope, r.intercept, r.rvalue**2
//   (0.6, 2.2, 0.6)
//
// Iris sepal length vs petal length (versicolor only):
//   >>> from sklearn.datasets import load_iris
//   >>> iris = load_iris()
//   >>> mask = iris.target == 1  # versicolor
//   >>> x = iris.data[mask, 0]   # sepal length
//   >>> y = iris.data[mask, 2]   # petal length
//   >>> r = stats.linregress(x, y)
//   >>> r.slope, r.intercept, r.rvalue**2
//   (0.6865, 0.1851, 0.5687)
// Tolerance: ±0.001.

describe("computeLinearRegression", () => {
    it("matches scipy anchor for [(1,2)…(5,5)]", () => {
        const fit = computeLinearRegression([
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 5 },
            { x: 4, y: 4 },
            { x: 5, y: 5 },
        ]);
        expect(fit).not.toBeNull();
        expect(fit?.slope).toBeCloseTo(0.6, 3);
        expect(fit?.intercept).toBeCloseTo(2.2, 3);
        expect(fit?.r2).toBeCloseTo(0.6, 3);
    });

    it("matches scipy anchor for iris versicolor sepal vs petal length", () => {
        const fit = computeLinearRegression(
            [
                { x: 7.0, y: 4.7 },
                { x: 6.4, y: 4.5 },
                { x: 6.9, y: 4.9 },
                { x: 5.5, y: 4.0 },
                { x: 6.5, y: 4.6 },
                { x: 5.7, y: 4.5 },
                { x: 6.3, y: 4.7 },
                { x: 4.9, y: 3.3 },
                { x: 6.6, y: 4.6 },
                { x: 5.2, y: 3.9 },
                { x: 5.0, y: 3.5 },
                { x: 5.9, y: 4.2 },
                { x: 6.0, y: 4.0 },
                { x: 6.1, y: 4.7 },
                { x: 5.6, y: 3.6 },
                { x: 6.7, y: 4.4 },
                { x: 5.6, y: 4.5 },
                { x: 5.8, y: 4.1 },
                { x: 6.2, y: 4.5 },
                { x: 5.6, y: 3.9 },
                { x: 5.9, y: 4.8 },
                { x: 6.1, y: 4.0 },
                { x: 6.3, y: 4.9 },
                { x: 6.1, y: 4.7 },
                { x: 6.4, y: 4.3 },
                { x: 6.6, y: 4.4 },
                { x: 6.8, y: 4.8 },
                { x: 6.7, y: 5.0 },
                { x: 6.0, y: 4.5 },
                { x: 5.7, y: 3.5 },
                { x: 5.5, y: 3.8 },
                { x: 5.5, y: 3.7 },
                { x: 5.8, y: 3.9 },
                { x: 6.0, y: 5.1 },
                { x: 5.4, y: 4.5 },
                { x: 6.0, y: 4.5 },
                { x: 6.7, y: 4.7 },
                { x: 6.3, y: 4.4 },
                { x: 5.6, y: 4.1 },
                { x: 5.5, y: 4.0 },
                { x: 5.5, y: 4.4 },
                { x: 6.1, y: 4.6 },
                { x: 5.8, y: 4.0 },
                { x: 5.0, y: 3.3 },
                { x: 5.6, y: 4.2 },
                { x: 5.7, y: 4.2 },
                { x: 5.7, y: 4.2 },
                { x: 6.2, y: 4.3 },
                { x: 5.1, y: 3.0 },
                { x: 5.7, y: 4.1 },
            ],
        );
        expect(fit).not.toBeNull();
        expect(fit?.slope).toBeCloseTo(0.6865, 3);
        expect(fit?.intercept).toBeCloseTo(0.1851, 3);
        expect(fit?.r2).toBeCloseTo(0.5687, 3);
    });

    it("returns perfect fit for [(1,2),(2,4),(3,6)]", () => {
        const fit = computeLinearRegression([
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 },
        ]);
        expect(fit).toEqual({ slope: 2, intercept: 0, r2: 1 });
    });

    it("returns r²=1 for horizontal line (intentional deviation from scipy nan convention)", () => {
        const fit = computeLinearRegression([
            { x: 1, y: 5 },
            { x: 2, y: 5 },
            { x: 3, y: 5 },
        ]);
        expect(fit).toEqual({ slope: 0, intercept: 5, r2: 1 });
    });

    it("returns null for vertical line (identical x)", () => {
        expect(
            computeLinearRegression([
                { x: 3, y: 1 },
                { x: 3, y: 2 },
                { x: 3, y: 3 },
            ]),
        ).toBeNull();
    });

    it("returns null for n=2", () => {
        expect(
            computeLinearRegression([
                { x: 1, y: 2 },
                { x: 2, y: 4 },
            ]),
        ).toBeNull();
    });

    it("returns null for n=1", () => {
        expect(computeLinearRegression([{ x: 1, y: 2 }])).toBeNull();
    });

    it("returns null for n=0", () => {
        expect(computeLinearRegression([])).toBeNull();
    });
});

// MUTATION-VERIFY:
//   In linearRegression.ts, change `ssXY / ssX` to `ssX / ssXY` (invert).
//   Re-run "matches scipy anchor for iris versicolor sepal vs petal length".
//   Expected slope 0.6865 becomes 1.4567 → test RED.
//   Verified manually: 2026-05-24. REVERTED.
