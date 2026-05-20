// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { BarErrorPlotData, BarErrorSpec, ChartSpec, KMPlotData } from "@/lib/chartSpec/types";

import { ChartRenderer } from "../ChartRenderer";

vi.mock("../d3/BarErrorChart", () => ({
    BarErrorChart: (): JSX.Element => <div data-testid="bar-error-chart">BarError</div>,
}));

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

const barData: BarErrorPlotData = {
    kind: "barError",
    categories: [{ label: "A", mean: 1, error: 0.1, n: 10 }],
};

const kmData: KMPlotData = {
    kind: "km",
    groups: [
        {
            label: "All",
            points: [{ time: 0, survival: 1, atRisk: 10, censored: 0 }],
        },
    ],
};

describe("ChartRenderer", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders BarErrorChart when kinds match", () => {
        render(<ChartRenderer plotData={barData} spec={barSpec} />);
        expect(screen.getByTestId("bar-error-chart")).toBeInTheDocument();
    });

    it("renders PlaceholderRenderer when plotData kind mismatches", () => {
        render(<ChartRenderer plotData={kmData} spec={barSpec} />);
        expect(screen.getByTestId("placeholder")).toHaveTextContent("barError");
    });

    it("renders PublicationKM for km", () => {
        const kmSpec = { ...barSpec, kind: "km" as const, legendA: "A", dashB: false, showAtRisk: true, showStats: false, timeUnit: "months" as const };
        render(<ChartRenderer plotData={kmData} spec={kmSpec} />);
        expect(screen.getByTestId("publication-km")).toBeInTheDocument();
    });

    it("renders PlaceholderRenderer for box and xy", () => {
        const boxSpec = { ...barSpec, kind: "box" as const, showOutliers: true, showMeanMarker: false, groupOrder: "alphabetical" as const };
        const { unmount: unmountBox } = render(
            <ChartRenderer plotData={{ kind: "box", groups: [] }} spec={boxSpec} />,
        );
        expect(screen.getByTestId("placeholder")).toHaveTextContent("box");
        unmountBox();
        cleanup();

        const xySpec = {
            ...barSpec,
            kind: "xy" as const,
            mode: "line" as const,
            showRegression: false,
            showCorrelation: false,
        };
        render(<ChartRenderer plotData={{ kind: "xy", series: [] }} spec={xySpec} />);
        expect(screen.getByTestId("placeholder")).toHaveTextContent("xy");
    });

    it("dispatches only on the four ChartSpec kinds", () => {
        expectTypeOf<ChartSpec["kind"]>().toEqualTypeOf<"km" | "barError" | "box" | "xy">();
    });
});
