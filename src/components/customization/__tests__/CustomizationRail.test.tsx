// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import { updateCustomizationTitle } from "@/lib/chartSpec/customizations/patchSpec";
import type { BarErrorSpec } from "@/lib/chartSpec/types";

import { CustomizationRail } from "../CustomizationRail";

describe("CustomizationRail", () => {
    it("renders bar error type controls for barError specs", () => {
        const spec = createDefaultChartSpec("barError", {
            id: "bar-rail",
            createdAt: "2026-05-20T10:00:00.000Z",
        }) as BarErrorSpec;

        render(
            <CustomizationRail
                mapping={{ group: "arm", outcome: "value" }}
                spec={spec}
                onSpecChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Error bar type")).toBeTruthy();
        expect(screen.getByLabelText("95% CI")).toBeTruthy();
        expect(screen.queryByText("No options yet.")).toBeNull();
        expect(screen.getByLabelText("Figure title")).toBeTruthy();
        expect(screen.getByLabelText("X-axis label")).toBeTruthy();
        expect(screen.getByLabelText("Y-axis label")).toBeTruthy();
    });

    it("updateCustomizationTitle writes into spec.customizations", () => {
        const spec = createDefaultChartSpec("barError", {
            id: "bar-rail-title",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const next = updateCustomizationTitle(spec, "My custom title");
        expect(next.customizations?.title).toBe("My custom title");
        expect(next.title).toBe("My custom title");
    });
});
