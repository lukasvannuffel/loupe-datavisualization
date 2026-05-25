import { describe, expect, it } from "vitest";

import { logLogCI } from "../greenwood";

describe("logLogCI", () => {
    // MUTATION-VERIFY: lower-branch sign flip → anchor [0.473, 0.985] red. REVERTED.
    //
    // Anchor: S=0.9 after 1 event at first step in n=10.
    // cumGreenwoodSum = 1 / (10 × 9) = 0.01111...
    // logS = ln(0.9) = -0.10536
    // varG = 0.01111 / (-0.10536)^2 = 1.0004
    // se = sqrt(1.0004) = 1.0002
    // Back-transform: S^exp(±1.96 × 1.0002)
    //   exp(+1.9604) = 7.103 → lower = 0.9^7.103 = 0.4731
    //   exp(-1.9604) = 0.1408 → upper = 0.9^0.1408 = 0.9853
    // Verified against R: survfit(Surv(c(rep(1,10)), c(1,rep(0,9))) ~ 1)
    //                     confint(..., conf.type="log-log")
    // Expected: lower ≈ 0.473, upper ≈ 0.985. Tolerance ±0.005.
    it("returns anchor CI for S=0.9, cumSum=1/90", () => {
        const { lower, upper } = logLogCI(0.9, 1 / 90);
        expect(lower).toBeCloseTo(0.473, 3);
        expect(upper).toBeCloseTo(0.985, 3);
    });

    // S=0.5, cumSum=0.05 → logS=ln(0.5), varG=0.05/logS², se≈0.3226
    // lower=0.5^exp(1.96×0.3226)≈0.271, upper=0.5^exp(-1.96×0.3226)≈0.692
    it("returns anchor CI for S=0.5, cumSum=0.05", () => {
        const { lower, upper } = logLogCI(0.5, 0.05);
        expect(lower).toBeCloseTo(0.271, 2);
        expect(upper).toBeCloseTo(0.692, 2);
    });

    it("returns NaN for S=1 or S=0", () => {
        expect(logLogCI(1, 0.05)).toEqual({ lower: Number.NaN, upper: Number.NaN });
        expect(logLogCI(0, 0.05)).toEqual({ lower: Number.NaN, upper: Number.NaN });
    });

    it("collapses to S when cumSum=0", () => {
        expect(logLogCI(0.5, 0)).toEqual({ lower: 0.5, upper: 0.5 });
    });
});
