import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import {
    patchBaseSpec,
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

    it("preserves interior spaces in title", () => {
        const initial = createDefaultChartSpec("km", {
            id: "patch-title-spaces",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const patched = updateCustomizationTitle(initial, "Survival curve");

        expect(patched.customizations?.title).toBe("Survival curve");
    });

    it("preserves trailing space while typing", () => {
        const initial = createDefaultChartSpec("km", {
            id: "patch-title-trailing-space",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const patched = updateCustomizationTitle(initial, "hello ");

        expect(patched.customizations?.title).toBe("hello ");
    });
});

describe("patchBaseSpec", () => {
    it("updates showGrid and strokeWeight without touching customizations", () => {
        const initial = createDefaultChartSpec("km", {
            id: "patch-base-spec",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const patched = patchBaseSpec(initial, { showGrid: false, strokeWeight: 2.2 });

        expect(patched.showGrid).toBe(false);
        expect(patched.strokeWeight).toBe(2.2);
        expect(patched.customizations).toEqual(initial.customizations);
        expect(patched.title).toBe(initial.title);
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
