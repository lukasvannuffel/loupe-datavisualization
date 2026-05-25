import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import { brandRows } from "@/lib/parser/types";

import { resolveWizardChartSpec } from "../resolveWizardChartSpec";

const mapping = {
    time: "months",
    event: "status",
    group: "arm",
};

describe("resolveWizardChartSpec", () => {
    it("builds a spec with customizations from mapping when chartSpec is null", () => {
        const result = resolveWizardChartSpec({
            chartKind: "km",
            chartSpec: null,
            dataset: {
                inferences: [],
                rows: brandRows([{ months: "1", status: "1", arm: "A" }]),
            },
            mapping,
        });

        expect(result.spec.kind).toBe("km");
        expect(result.spec.customizations?.axes?.x).toBeTruthy();
        expect(result.mapping).toEqual(mapping);
    });

    it("reuses an existing chartSpec when provided", () => {
        const existing = createDefaultChartSpec("box", { id: "box-1", createdAt: "2026-05-20T10:00:00.000Z" });
        const result = resolveWizardChartSpec({
            chartKind: "box",
            chartSpec: existing,
            dataset: null,
            mapping: { group: "arm", outcome: "value" },
        });

        expect(result.spec.id).toBe("box-1");
    });
});
