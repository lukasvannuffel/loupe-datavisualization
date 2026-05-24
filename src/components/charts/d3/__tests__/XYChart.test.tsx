// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LongitudinalData, XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";

import { XYChart } from "../XYChart";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const xyFixture: XYPlotData = {
    kind: "xy",
    groups: [
        {
            label: "A",
            points: [
                { x: 0, y: 1 },
                { x: 1, y: 2 },
                { x: 2, y: 3 },
            ],
        },
        {
            label: "B",
            points: [
                { x: 0, y: 2 },
                { x: 1, y: 3 },
                { x: 2, y: 4 },
            ],
        },
    ],
    regressions: [],
    regressionSkipped: false,
    xMin: 0,
    xMax: 2,
    yMin: 1,
    yMax: 4,
};

const longitudinalFixture: LongitudinalData = {
    kind: "longitudinal",
    groups: [
        {
            label: "A",
            points: [
                { visit: 1, mean: 10, sem: 1, n: 3 },
                { visit: 2, mean: 12, sem: 1, n: 3 },
                { visit: 3, mean: 14, sem: 0, n: 1 },
            ],
        },
    ],
    xMin: 1,
    xMax: 3,
    yMin: 9,
    yMax: 15,
};

const installResizeObserver = (width: number): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (): void => {
            trigger([
                {
                    contentRect: {
                        width,
                        height: 320,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 320,
                        right: width,
                        toJSON: () => ({}),
                    },
                } as ResizeObserverEntry,
            ]);
        };
        unobserve = (): void => undefined;
        disconnect = (): void => undefined;
    }

    vi.stubGlobal("ResizeObserver", MockResizeObserver);
};

describe("XYChart", () => {
    let bboxSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeEach(() => {
        installResizeObserver(380);
        bboxSpy = vi
            .spyOn(SVGGraphicsElement.prototype, "getBBox")
            .mockImplementation(
                () =>
                    ({
                        width: 40,
                        height: 12,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        right: 40,
                        bottom: 12,
                        toJSON: () => ({}),
                    }) as DOMRect,
            );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        bboxSpy?.mockRestore();
    });

    it("renders line mode with paths but no markers", async () => {
        const { container } = render(<XYChart data={xyFixture} mode="line" />);
        await waitFor(() => {
            expect(container.querySelector('[data-role="xy-line"]')).toBeTruthy();
            expect(container.querySelector('[data-role="xy-marker"]')).toBeNull();
        });
    });

    it("renders scatter mode with markers but no lines", async () => {
        const { container } = render(<XYChart data={xyFixture} mode="scatter" />);
        await waitFor(() => {
            expect(container.querySelector('[data-role="xy-marker"]')).toBeTruthy();
            expect(container.querySelector('[data-role="xy-line"]')).toBeNull();
        });
    });

    it("renders both mode with lines and markers", async () => {
        const { container } = render(<XYChart data={xyFixture} mode="both" />);
        await waitFor(() => {
            expect(container.querySelector('[data-role="xy-line"]')).toBeTruthy();
            expect(container.querySelector('[data-role="xy-marker"]')).toBeTruthy();
        });
    });

    it("renders error bands when showErrorBands=true on longitudinal data", async () => {
        const { container } = render(
            <XYChart data={longitudinalFixture} mode="line" showErrorBands />,
        );
        await waitFor(() => {
            expect(container.querySelector('[data-role="xy-band"]')).toBeTruthy();
        });
    });

    it("renders distinct line styles per group (DASH_BY_INDEX)", async () => {
        const { container } = render(<XYChart data={xyFixture} mode="line" />);
        await waitFor(() => {
            const lines = container.querySelectorAll('[data-role="xy-line"]');
            expect(lines.length).toBe(2);
            expect(lines[0]?.getAttribute("stroke-dasharray")).toBeNull();
            expect(lines[1]?.getAttribute("stroke-dasharray")).toBe("6 3");
        });
    });

    it("renders distinct marker shapes per group (MARKER_BY_INDEX)", async () => {
        const { container } = render(<XYChart data={xyFixture} mode="scatter" />);
        await waitFor(() => {
            const markersA = container.querySelectorAll(".xy-group-A [data-role='xy-marker']");
            const markersB = container.querySelectorAll(".xy-group-B [data-role='xy-marker']");
            expect(markersA[0]?.getAttribute("d")).not.toBe(markersB[0]?.getAttribute("d"));
        });
    });

    it("renders regression line spanning only the observed x-range of the group", async () => {
        const data: XYPlotData = {
            kind: "xy",
            groups: [
                {
                    label: "A",
                    points: [
                        { x: 10, y: 20 },
                        { x: 30, y: 40 },
                        { x: 50, y: 60 },
                    ],
                },
            ],
            regressions: [{ label: "A", slope: 1, intercept: 10, r2: 1 }],
            regressionSkipped: false,
            xMin: 10,
            xMax: 50,
            yMin: 20,
            yMax: 60,
        };
        const { container } = render(<XYChart data={data} mode="scatter" showRegression />);
        await waitFor(() => {
            const line = container.querySelector('[data-role="xy-regression"]');
            expect(line).toBeTruthy();
            expect(line?.getAttribute("data-observed-x-min")).toBe("10");
            expect(line?.getAttribute("data-observed-x-max")).toBe("50");
        });
    });
});
