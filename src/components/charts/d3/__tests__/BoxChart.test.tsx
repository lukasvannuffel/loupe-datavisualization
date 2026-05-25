// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BoxPlotData, BoxStats } from "@/lib/chartSpec/aggregators/boxPlot.types";
import type { BoxSpec } from "@/lib/chartSpec/types";

import { BoxChart } from "../BoxChart";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const boxSpec = (overrides: Partial<BoxSpec> = {}): BoxSpec => ({
    version: 1,
    id: "box-spec-1",
    createdAt: "2026-05-20T10:00:00.000Z",
    title: "Distribution by group",
    showLegend: true,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "box",
    showOutliers: true,
    showMeanMarker: false,
    notched: false,
    ...overrides,
});

const sampleBox: BoxStats = {
    kind: "box",
    label: "A",
    n: 10,
    min: 1,
    q1: 2,
    median: 3,
    q3: 4,
    max: 5,
    mean: 3,
    outliers: [8],
    notchLower: 2.5,
    notchUpper: 3.5,
};

const twoGroupFixture: BoxPlotData = {
    kind: "box",
    yMin: 1,
    yMax: 8,
    groups: [
        sampleBox,
        {
            ...sampleBox,
            label: "B",
            outliers: [],
        },
    ],
};

const mixedFixture: BoxPlotData = {
    kind: "box",
    yMin: 1,
    yMax: 14,
    groups: [
        sampleBox,
        { kind: "strip", label: "Small", n: 3, values: [1, 2, 3] },
    ],
};

const notchedFixture: BoxPlotData = {
    kind: "box",
    yMin: 1,
    yMax: 8,
    groups: [sampleBox],
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

describe("BoxChart", () => {
    let bboxSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeEach(() => {
        installResizeObserver(420);
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

    const renderAndDraw = async (data: BoxPlotData, spec: BoxSpec): Promise<HTMLElement> => {
        const view = render(<BoxChart data={data} spec={spec} />);
        await waitFor(() => {
            expect(view.container.querySelector("rect[data-role='box-rect']")).toBeTruthy();
        });

        return view.container;
    };

    it("renders box for n≥5 group and strip for n<5 group in the same chart", async () => {
        const container = render(<BoxChart data={mixedFixture} spec={boxSpec()} />).container;
        await waitFor(() => {
            expect(container.querySelector("rect[data-role='box-rect']")).toBeTruthy();
            expect(container.querySelector("circle[data-role='strip-point']")).toBeTruthy();
        });
    });

    it("editorial palette uses paper fill and ink stroke for all boxes", async () => {
        const container = await renderAndDraw(twoGroupFixture, boxSpec());
        const boxes = container.querySelectorAll("rect[data-role='box-rect']");
        expect(boxes.length).toBeGreaterThanOrEqual(2);
        for (const box of boxes) {
            expect(box.getAttribute("fill-opacity")).toBe("1");
            expect(box.getAttribute("stroke")).toBe(boxes[0]!.getAttribute("stroke"));
        }
    });

    it("okabe-ito palette tints box fill per group", async () => {
        const container = await renderAndDraw(twoGroupFixture, {
            ...boxSpec(),
            customizations: { palette: "okabe-ito" },
        });
        const fills = [...container.querySelectorAll("rect[data-role='box-rect']")].map((box) =>
            box.getAttribute("fill"),
        );
        expect(new Set(fills).size).toBeGreaterThanOrEqual(2);
        expect(fills[0]).toMatch(/var\(--palette-okabe-ito-0\)|#0072B2/i);
    });

    it("renders notch path when notched=true", async () => {
        const container = render(<BoxChart data={notchedFixture} spec={boxSpec({ notched: true })} />).container;
        await waitFor(() => {
            expect(container.querySelector("path[data-role='box-notch']")).toBeTruthy();
        });
    });

    it("does not render notch path when notched=false", async () => {
        const container = await renderAndDraw(notchedFixture, boxSpec({ notched: false }));
        expect(container.querySelector("path[data-role='box-notch']")).toBeNull();
    });

    it("renders mean marker when showMeanMarker=true (different shape from outliers)", async () => {
        const container = render(
            <BoxChart data={notchedFixture} spec={boxSpec({ showMeanMarker: true })} />,
        ).container;
        await waitFor(() => {
            const mean = container.querySelector("circle[data-role='box-mean']");
            const outlier = container.querySelector("circle[data-role='box-outlier']");
            expect(mean).toBeTruthy();
            expect(outlier).toBeTruthy();
            expect(mean?.getAttribute("fill")).not.toBe("none");
            expect(outlier?.getAttribute("fill")).not.toBe(mean?.getAttribute("fill"));
        });
    });

    it("shows sample-size caption when any group has kind=strip", async () => {
        const { container } = render(<BoxChart data={mixedFixture} spec={boxSpec()} />);
        await waitFor(() => {
            const caption = container.querySelector(".rec-box-strip-caption");
            expect(caption?.textContent).toMatch(/n<5.*individual points/i);
        });
    });
});
