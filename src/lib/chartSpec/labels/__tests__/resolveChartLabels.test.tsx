// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GroupStats } from "@/lib/chartSpec/aggregators/barError.types";
import type { BarErrorSpec } from "@/lib/chartSpec/types";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";

import { BarErrorChart } from "@/components/charts/d3/BarErrorChart";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const twoGroups: readonly GroupStats[] = [
    { label: "A", mean: 10, sd: 1, n: 20 },
    { label: "B", mean: 14, sd: 1.5, n: 25 },
];

const installResizeObserver = (): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (): void => {
            trigger([
                {
                    contentRect: {
                        width: 400,
                        height: 250,
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

const baseLegacySpec = (): BarErrorSpec => ({
    version: 1,
    id: "legacy-bar-spec",
    createdAt: "2026-05-20T10:00:00.000Z",
    title: "Legacy title",
    xLabel: "Legacy X",
    yLabel: "Legacy Y",
    showLegend: false,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "barError",
    errorBarType: "sem",
    annotations: [],
});

describe("resolveChartLabels backward compat", () => {
    beforeEach(() => {
        installResizeObserver();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("resolveChartLabels prefers customizations.title over legacy spec.title", () => {
        const spec: BarErrorSpec = {
            ...baseLegacySpec(),
            customizations: {
                title: "New title",
                axes: { x: { label: "X" }, y: { label: "Y" } },
            },
        };

        expect(resolveChartLabels(spec).title).toBe("New title");
    });

    it("renders legacy spec.title when customizations.title is unset (backward compat)", async () => {
        const legacySpec: BarErrorSpec = {
            ...baseLegacySpec(),
            customizations: {
                axes: { x: { label: "X" }, y: { label: "Y" } },
            },
        };

        const { container } = render(
            <BarErrorChart groups={twoGroups} spec={legacySpec} />,
        );

        await waitFor(() => {
            expect(container.querySelector('[data-role="chart-title"]')?.textContent).toBe(
                "Legacy title",
            );
        });
    });

    it("customizations.title overrides legacy spec.title when both are set", async () => {
        const spec: BarErrorSpec = {
            ...baseLegacySpec(),
            customizations: {
                title: "New title",
                axes: { x: { label: "X" }, y: { label: "Y" } },
            },
        };

        const { container } = render(<BarErrorChart groups={twoGroups} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelector('[data-role="chart-title"]')?.textContent).toBe(
                "New title",
            );
        });
    });
});
