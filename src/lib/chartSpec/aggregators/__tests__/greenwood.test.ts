import { describe, expect, it } from "vitest";

import { logLogCI } from "../greenwood";

describe("logLogCI", () => {
    it("returns anchor CI for S=0.9, cumSum=1/90", () => {
        const { lower, upper } = logLogCI(0.9, 1 / 90);
        expect(lower).toBeCloseTo(0.473, 2);
        expect(upper).toBeCloseTo(0.986, 2);
    });

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
