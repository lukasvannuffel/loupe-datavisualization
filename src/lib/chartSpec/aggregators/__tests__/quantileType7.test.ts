import { describe, expect, it } from "vitest";

import { percentileType7 } from "../quantileType7";

// Anchors verified against numpy.percentile(x, [25,50,75], method='linear'):
//   >>> import numpy as np
//   >>> np.percentile([1,2,3,4,5,6,7,8,9,10], [25,50,75])
//   array([3.25, 5.5 , 7.75])
//   >>> np.percentile([1,2,3,4,5], [25,50,75])
//   array([2., 3., 4.])
//   >>> np.percentile([1,1,1,1,1], [25,50,75])
//   array([1., 1., 1.])
// Tolerance: ±0.001.
//
// MUTATION-VERIFY: change (n - 1) * p to n * p in quantileType7.ts;
// [1..10] at p=0.25 must red (2.5 instead of 3.25). REVERTED.

describe("percentileType7", () => {
    const seq1to10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const seq1to5 = [1, 2, 3, 4, 5];
    const allOnes = [1, 1, 1, 1, 1];

    it("matches numpy for [1..10] at p=0.25, 0.5, 0.75", () => {
        expect(percentileType7(seq1to10, 0.25)).toBeCloseTo(3.25, 3);
        expect(percentileType7(seq1to10, 0.5)).toBeCloseTo(5.5, 3);
        expect(percentileType7(seq1to10, 0.75)).toBeCloseTo(7.75, 3);
    });

    it("matches numpy for [1..5] at p=0.25, 0.5, 0.75", () => {
        expect(percentileType7(seq1to5, 0.25)).toBeCloseTo(2.0, 3);
        expect(percentileType7(seq1to5, 0.5)).toBeCloseTo(3.0, 3);
        expect(percentileType7(seq1to5, 0.75)).toBeCloseTo(4.0, 3);
    });

    it("returns 1.0 for all-identical values at p=0.5", () => {
        expect(percentileType7(allOnes, 0.5)).toBeCloseTo(1.0, 3);
    });

    it("returns the sole value for a single-element array", () => {
        expect(percentileType7([42], 0.5)).toBe(42);
    });

    it("returns NaN for an empty array", () => {
        expect(Number.isNaN(percentileType7([], 0.5))).toBe(true);
    });
});
