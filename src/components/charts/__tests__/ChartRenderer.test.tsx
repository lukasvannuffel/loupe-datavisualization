// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { BarErrorSpec, ChartSpec } from "@/lib/chartSpec/types";

import { ChartRenderer } from "../ChartRenderer";

vi.mock("../PublicationKM", () => ({
    PublicationKM: (): JSX.Element => <div data-testid="publication-km">KM</div>,
}));

vi.mock("../PlaceholderRenderer", () => ({
    PlaceholderRenderer: ({ kind }: { kind: ChartSpec["kind"] }): JSX.Element => (
        <div data-testid="placeholder">{kind}</div>
    ),
}));

const barSpec: BarErrorSpec = {
    version: 1,
    id: "1",
    createdAt: "2026-05-20T10:00:00.000Z",
    title: "Bar",
    showLegend: false,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "barError",
    errorBarType: "sem",
    annotations: [],
};

describe("ChartRenderer", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders PlaceholderRenderer for barError (real chart is on Recommendation)", () => {
        render(<ChartRenderer spec={barSpec} />);
        expect(screen.getByTestId("placeholder")).toHaveTextContent("barError");
    });

    it("renders PublicationKM for km", () => {
        const kmSpec = {
            ...barSpec,
            kind: "km" as const,
            legendA: "A",
            dashB: false,
            showAtRisk: true,
            showStats: false,
            timeUnit: "months" as const,
        };
        render(<ChartRenderer spec={kmSpec} />);
        expect(screen.getByTestId("publication-km")).toBeInTheDocument();
    });

    it("renders PlaceholderRenderer for box and xy", () => {
        const boxSpec = {
            ...barSpec,
            kind: "box" as const,
            showOutliers: true,
            showMeanMarker: false,
            notched: false,
        };
        const { unmount: unmountBox } = render(<ChartRenderer spec={boxSpec} />);
        expect(screen.getByTestId("placeholder")).toHaveTextContent("box");
        unmountBox();
        cleanup();

        const xySpec = {
            ...barSpec,
            kind: "xy" as const,
            mode: "line" as const,
            showRegression: false,
            showErrorBands: false,
        };
        render(<ChartRenderer spec={xySpec} />);
        expect(screen.getByTestId("placeholder")).toHaveTextContent("xy");
    });

    it("dispatches only on the four ChartSpec kinds", () => {
        expectTypeOf<ChartSpec["kind"]>().toEqualTypeOf<"km" | "barError" | "box" | "xy">();
    });
});
