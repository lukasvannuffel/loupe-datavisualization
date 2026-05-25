// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import {
    updateCustomizationPalette,
    updateCustomizationTitle,
} from "@/lib/chartSpec/customizations/patchSpec";
import type { BarErrorSpec, PaletteName } from "@/lib/chartSpec/types";

import { CustomizationRail } from "../CustomizationRail";

afterEach(() => {
    cleanup();
});

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

    it("renders all seven palette options", () => {
        const spec = createDefaultChartSpec("km", {
            id: "km-rail-palette",
            createdAt: "2026-05-20T10:00:00.000Z",
        });

        render(
            <CustomizationRail mapping={{ time: "t", event: "e" }} spec={spec} onSpecChange={vi.fn()} />,
        );

        const listbox = screen.getByRole("listbox", { name: /chart palette/i });
        expect(within(listbox).getAllByRole("option")).toHaveLength(7);
        expect(within(listbox).getByText("Okabe–Ito")).toBeTruthy();
        expect(within(listbox).getByText("Monochrome")).toBeTruthy();
    });

    it("calls onSpecChange when a palette is selected", () => {
        const onSpecChange = vi.fn();
        const spec = createDefaultChartSpec("barError", {
            id: "bar-rail-palette-change",
            createdAt: "2026-05-20T10:00:00.000Z",
        }) as BarErrorSpec;

        render(
            <CustomizationRail
                mapping={{ group: "arm", outcome: "value" }}
                spec={spec}
                onSpecChange={onSpecChange}
            />,
        );

        const listbox = screen.getByRole("listbox", { name: /chart palette/i });
        fireEvent.click(within(listbox).getByRole("option", { name: /Okabe–Ito/i }));

        expect(onSpecChange).toHaveBeenCalled();
        const next = onSpecChange.mock.calls[0]![0](spec);
        expect(next.customizations?.palette).toBe("okabe-ito");
    });

    it("updateCustomizationPalette writes into spec.customizations", () => {
        const spec = createDefaultChartSpec("xy", {
            id: "xy-palette-patch",
            createdAt: "2026-05-20T10:00:00.000Z",
        });
        const next = updateCustomizationPalette(spec, "wong" satisfies PaletteName);
        expect(next.customizations?.palette).toBe("wong");
    });

    it("box rail shows notched and showMeanMarker checkboxes", () => {
        const spec = createDefaultChartSpec("box", {
            id: "box-rail-toggles",
            createdAt: "2026-05-20T10:00:00.000Z",
        });

        render(
            <CustomizationRail
                mapping={{ group: "arm", outcome: "value" }}
                spec={spec}
                onSpecChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Show notch (95% CI of median)")).toBeTruthy();
        expect(screen.getByLabelText("Show mean marker")).toBeTruthy();
    });

    // MUTATION-VERIFY:
    //   CustomizationRail.tsx:56 — comment out the `{spec.kind === "box" ? <BoxRail .../> : null}` line.
    //   Test: "box rail shows notched and showMeanMarker checkboxes".
    //   Box toggles missing from document → test RED.
    //   Verified manually: 2026-05-25. REVERTED.

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
