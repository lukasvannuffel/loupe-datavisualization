import { describe, expect, it } from "vitest";

import { tCritical } from "../tCritical";

describe("tCritical", () => {
    it("returns 12.706 for df=1", () => {
        expect(tCritical(1)).toBeCloseTo(12.706, 3);
    });

    it("returns 3.182 for df=3", () => {
        expect(tCritical(3)).toBeCloseTo(3.182, 3);
    });

    it("returns 2.262 for df=9", () => {
        expect(tCritical(9)).toBeCloseTo(2.262, 3);
    });

    it("returns 2.045 for df=29", () => {
        expect(tCritical(29)).toBeCloseTo(2.045, 3);
    });

    it("returns 2.042 for df=30 (extended table, not normal cliff)", () => {
        expect(tCritical(30)).toBeCloseTo(2.042, 3);
    });

    it("returns 2.014 for df=45", () => {
        expect(tCritical(45)).toBeCloseTo(2.014, 3);
    });

    it("returns 2.000 for df=60", () => {
        expect(tCritical(60)).toBeCloseTo(2.0, 3);
    });

    it("returns 1.960 for df=61 (normal approximation)", () => {
        expect(tCritical(61)).toBeCloseTo(1.96, 3);
    });

    it("returns 1.960 for df=100 (normal approximation)", () => {
        expect(tCritical(100)).toBeCloseTo(1.96, 3);
    });

    it("returns NaN for df=0", () => {
        expect(tCritical(0)).toBeNaN();
    });
});
