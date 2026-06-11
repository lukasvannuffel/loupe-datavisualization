import { describe, expect, it } from "vitest";

import { buildBarErrorCaption, buildBarErrorMetaLine } from "../exportBarErrorFigureText";

const assertNoFabricatedStats = (caption: string): void => {
    expect(caption).not.toMatch(/ANOVA/i);
    expect(caption).not.toMatch(/\bF\s*=/i);
    expect(caption).not.toMatch(/\bp\s*=/i);
    expect(caption).not.toMatch(/\bp\s*</i);
};

describe("buildBarErrorMetaLine", () => {
    it("formats multiple groups with total n", () => {
        const groups = [{ n: 78 }, { n: 134 }, { n: 96 }, { n: 31 }];

        expect(buildBarErrorMetaLine(groups)).toBe("n = 339 · groups = 4");
    });

    it("formats a single group without a groups label", () => {
        expect(buildBarErrorMetaLine([{ n: 50 }])).toBe("n = 50");
    });

    it("returns n = 0 for empty groups", () => {
        expect(buildBarErrorMetaLine([])).toBe("n = 0");
    });
});

describe("buildBarErrorCaption", () => {
    it("describes 95% confidence intervals without fabricated statistics", () => {
        const caption = buildBarErrorCaption("ci95");

        expect(caption).toContain("95% confidence intervals");
        expect(caption).toContain("t-distribution");
        assertNoFabricatedStats(caption);
    });

    it("describes standard error without fabricated statistics", () => {
        const caption = buildBarErrorCaption("sem");

        expect(caption).toContain("standard error");
        assertNoFabricatedStats(caption);
    });

    it("describes standard deviation without fabricated statistics", () => {
        const caption = buildBarErrorCaption("sd");

        expect(caption).toContain("standard deviation");
        assertNoFabricatedStats(caption);
    });

    /**
     * MUTATION-VERIFY
     * Mutation: `src/components/pages/exportBarErrorFigureText.ts` changed the `ci95`
     * branch to return `"ANOVA F = 18.4, p < 0.001."`.
     * Red test: `describes 95% confidence intervals without fabricated statistics`.
     * Verified manually: 2026-06-11. REVERTED.
     */
    it("describes 95% confidence intervals without fabricated statistics — mutation anchor", () => {
        const caption = buildBarErrorCaption("ci95");

        expect(caption).not.toMatch(/ANOVA/i);
    });
});
