import { describe, expect, it } from "vitest";

import type { Receipt } from "@/lib/chartSpec/types";

import type { GroupStats } from "../barError.types";
import { canDrawErrorBars, computeErrorBar, inferErrorTypeFromReceipt, Z_95 } from "../errorBars";

const group: GroupStats = { label: "A", mean: 10, sd: 2, n: 4 };

describe("canDrawErrorBars", () => {
    it("is false when n<2", () => {
        expect(canDrawErrorBars({ ...group, n: 1 })).toBe(false);
    });

    it("is true when n>=2 and sd>0", () => {
        expect(canDrawErrorBars(group)).toBe(true);
    });
});

describe("computeErrorBar", () => {
    it("returns 0 when n<2", () => {
        expect(computeErrorBar({ ...group, n: 1 }, "sd")).toBe(0);
    });

    it("returns sd for SD type", () => {
        expect(computeErrorBar(group, "sd")).toBe(2);
    });

    it("returns sd/sqrt(n) for SEM", () => {
        expect(computeErrorBar(group, "sem")).toBeCloseTo(1, 5);
    });

    it("returns 1.96*sem for CI95 on small group", () => {
        expect(computeErrorBar(group, "ci95")).toBeCloseTo(Z_95, 5);
    });

    it("returns CI95 half-width 3.92 for sd=10 and n=25", () => {
        const large: GroupStats = { label: "L", mean: 50, sd: 10, n: 25 };
        expect(computeErrorBar(large, "sem")).toBeCloseTo(2, 5);
        expect(computeErrorBar(large, "ci95")).toBeCloseTo(3.92, 5);
    });
});

describe("inferErrorTypeFromReceipt", () => {
    const base: Receipt = {
        alternatives: [],
        intent: "test",
        overrides: [],
        recommendation: {
            because: "b",
            becauseTitle: "B",
            chartName: "Chart",
            handles: "h",
            handlesTitle: "H",
            headline: "H",
        },
        selectionMode: "ai",
        tests: [],
        testsTitle: "Tests",
        transformations: [],
    };

    it("infers ci95 from 95% CI hint", () => {
        const receipt: Receipt = {
            ...base,
            tests: [{ label: "t-test", name: "95% CI" }],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("ci95");
    });

    it("infers ci95 from 95%CI without space", () => {
        const receipt: Receipt = {
            ...base,
            tests: [{ label: "Post-hoc", name: "95%CI bars" }],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("ci95");
    });

    it("infers ci95 from confidence interval wording", () => {
        const receipt: Receipt = {
            ...base,
            tests: [
                {
                    label: "Analysis",
                    name: "ninety-five percent confidence interval",
                },
            ],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("ci95");
    });

    it("infers sem from SEM hint", () => {
        const receipt: Receipt = {
            ...base,
            tests: [{ label: "Comparison", name: "SEM error bars" }],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("sem");
    });

    it("infers sem from standard error wording", () => {
        const receipt: Receipt = {
            ...base,
            tests: [{ label: "Means", name: "standard error of the mean" }],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("sem");
    });

    it("falls back to sem for t-test without error-bar hint", () => {
        const receipt: Receipt = {
            ...base,
            tests: [{ label: "Independent samples t-test", name: "p = 0.04" }],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("sem");
    });

    it("falls back to sem when tests array is empty", () => {
        expect(inferErrorTypeFromReceipt(base)).toBe("sem");
    });

    it("prefers ci95 when SD and 95% CI appear in the same test row", () => {
        const receipt: Receipt = {
            ...base,
            tests: [{ label: "Report", name: "SD and 95% CI shown" }],
        };
        expect(inferErrorTypeFromReceipt(receipt)).toBe("ci95");
    });
});

describe("Z_95", () => {
    it("is exactly 1.96", () => {
        expect(Z_95).toBe(1.96);
    });
});
