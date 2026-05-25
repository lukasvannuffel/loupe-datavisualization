import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import {
    updateCustomizationTitle,
    updateAxisLabel,
} from "@/lib/chartSpec/customizations/patchSpec";

describe("updateCustomizationTitle", () => {
    it("patchSpec writes customizations.title, NOT legacy spec.title", () => {
        const initial = createDefaultChartSpec("barError", {
            id: "patch-title-spec",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const patched = updateCustomizationTitle(initial, "Updated");

        expect(patched.customizations?.title).toBe("Updated");
        expect(patched.title).toBe(initial.title);
    });

    // MUTATION-VERIFY:
    //   patchSpec.ts:23 — re-add `title: trimmed` alongside customizations.title in the return block.
    //   Test: "patchSpec writes customizations.title, NOT legacy spec.title".
    //   Verified manually: 2026-05-25. REVERTED.

    it("drops customizations.title override when cleared to empty string", () => {
        const initial = createDefaultChartSpec("barError", {
            id: "patch-clear-title",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const withTitle = updateCustomizationTitle(initial, "Custom");
        const cleared = updateCustomizationTitle(withTitle, "   ");

        expect(cleared.customizations?.title).toBeUndefined();
        expect(cleared.title).toBe(initial.title);
    });
});

describe("updateAxisLabel", () => {
    it("writes customizations.axes only, not legacy xLabel", () => {
        const initial = createDefaultChartSpec("barError", {
            id: "patch-axis-spec",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const patched = updateAxisLabel(initial, "x", "Custom X");

        expect(patched.customizations?.axes?.x?.label).toBe("Custom X");
        expect(patched.xLabel).toBe(initial.xLabel);
    });
});
