import { describe, expect, it } from "vitest";

import {
    KM_STAT_PLACEHOLDER_LINES,
    resolveKmStatLines,
} from "../kmStatsAnnotation";

describe("resolveKmStatLines", () => {
    it("falls back to placeholders when tests are missing", () => {
        expect(resolveKmStatLines(undefined)).toEqual(KM_STAT_PLACEHOLDER_LINES);
        expect(resolveKmStatLines([])).toEqual(KM_STAT_PLACEHOLDER_LINES);
    });

    it("falls back to placeholders for AI methodology bullets without numeric results", () => {
        const lines = resolveKmStatLines([
            {
                label: "Log-rank test comparing survival curves between treatment groups",
            },
            {
                label: "Median survival time estimation with confidence intervals for each group",
            },
        ]);

        expect(lines).toEqual(KM_STAT_PLACEHOLDER_LINES);
    });

    it("uses compact stat labels from receipt tests", () => {
        const lines = resolveKmStatLines([
            { label: "Cox HR 0.74 (95% CI 0.61-0.89)" },
            { label: "log-rank p < 0.001" },
        ]);

        expect(lines).toEqual([
            "Cox HR 0.74 (95% CI 0.61-0.89)",
            "log-rank p < 0.001",
        ]);
    });

    it("formats structured Cox and log-rank fields", () => {
        const lines = resolveKmStatLines([
            {
                label: "Cox proportional hazards",
                name: "Cox proportional hazards",
                statistic: 0.74,
                ci95: [0.61, 0.89],
            },
            {
                label: "log-rank",
                name: "log-rank",
                pValue: 0.0008,
            },
        ]);

        expect(lines[0]).toBe("HR 0.74 (95% CI 0.61–0.89)");
        expect(lines[1]).toBe("log-rank p < 0.001");
    });
});
