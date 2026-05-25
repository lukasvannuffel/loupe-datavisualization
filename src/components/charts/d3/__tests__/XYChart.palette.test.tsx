// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { XYSpec } from "@/lib/chartSpec/types";

import { XYChart } from "../XYChart";
import * as useResizeObserverModule from "../useResizeObserver";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const twoGroupData: XYPlotData = {
    kind: "xy",
    groups: [
        { label: "A", points: [{ x: 1, y: 2 }, { x: 2, y: 3 }] },
        { label: "B", points: [{ x: 1, y: 4 }, { x: 2, y: 5 }] },
    ],
    regressions: [],
    regressionSkipped: false,
    xMin: 1,
    xMax: 2,
    yMin: 2,
    yMax: 5,
};

const installResizeObserver = (): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (el: Element): void => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            trigger([
                {
                    contentRect: {
                        width: rect.width || 400,
                        height: rect.height || 250,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 250,
                        right: 400,
                        toJSON: () => ({}),
                    },
                } as ResizeObserverEntry,
            ]);
        };
        disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
};

const defaultXYSpec = (): XYSpec =>
    createDefaultChartSpec("xy", {
        id: "xy-palette-spec",
        createdAt: "2026-05-20T10:00:00.000Z",
    }) as XYSpec;

describe("XYChart palette", () => {
    beforeEach(() => {
        installResizeObserver();
        vi.spyOn(useResizeObserverModule, "useResizeObserver").mockReturnValue([
            { current: null },
            { width: 400, height: 250 },
        ]);
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("defaults to monochrome palette with distinct grays for two groups", async () => {
        const { container } = render(
            <XYChart
                data={twoGroupData}
                mode="scatter"
                showErrorBands={false}
                showRegression={false}
                spec={defaultXYSpec()}
            />,
        );

        await waitFor(() => {
            const g0 = container.querySelector('[data-group-index="0"] [data-role="xy-marker"]');
            const g1 = container.querySelector('[data-group-index="1"] [data-role="xy-marker"]');
            expect(g0?.getAttribute("fill")).toMatch(/var\(--palette-monochrome-0\)|#000000/i);
            expect(g1?.getAttribute("fill")).toMatch(/var\(--palette-monochrome-1\)|#404040/i);
        });
    });

    it("okabe-ito palette gives distinct colors to each group", async () => {
        const spec: XYSpec = {
            ...defaultXYSpec(),
            customizations: { palette: "okabe-ito" },
        };
        const { container } = render(
            <XYChart
                data={twoGroupData}
                mode="scatter"
                showErrorBands={false}
                showRegression={false}
                spec={spec}
            />,
        );

        await waitFor(() => {
            const g0Color = container
                .querySelector('[data-group-index="0"] [data-role="xy-marker"]')
                ?.getAttribute("fill");
            const g1Color = container
                .querySelector('[data-group-index="1"] [data-role="xy-marker"]')
                ?.getAttribute("fill");

            expect(g0Color).not.toBe(g1Color);
            expect(g0Color).toMatch(/var\(--palette-okabe-ito-0\)|#0072B2/i);
            expect(g1Color).toMatch(/var\(--palette-okabe-ito-1\)|#E69F00/i);
        });
    });

    it("dash patterns survive palette changes", async () => {
        const monoSpec: XYSpec = { ...defaultXYSpec(), mode: "line" };
        const okaSpec: XYSpec = {
            ...monoSpec,
            customizations: { palette: "okabe-ito" },
        };

        const { container: mono } = render(
            <XYChart
                data={twoGroupData}
                mode="line"
                showErrorBands={false}
                showRegression={false}
                spec={monoSpec}
            />,
        );
        const { container: oka } = render(
            <XYChart
                data={twoGroupData}
                mode="line"
                showErrorBands={false}
                showRegression={false}
                spec={okaSpec}
            />,
        );

        await waitFor(() => {
            const monoG1Dash = mono
                .querySelector('[data-group-index="1"] [data-role="xy-line"]')
                ?.getAttribute("stroke-dasharray");
            const okaG1Dash = oka
                .querySelector('[data-group-index="1"] [data-role="xy-line"]')
                ?.getAttribute("stroke-dasharray");
            expect(monoG1Dash).toBeTruthy();
            expect(monoG1Dash).toBe(okaG1Dash);
        });
    });
});
