// @vitest-environment happy-dom

import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BarErrorPlotData, BarErrorSpec } from "@/lib/chartSpec/types";

import { BarErrorChart, barErrorChartRenderCountForTest } from "../BarErrorChart";
import * as useResizeObserverModule from "../useResizeObserver";

const scaleLinearDomainCalls: number[][] = [];

vi.mock("d3-scale", async (importOriginal) => {
    const actual = await importOriginal<typeof import("d3-scale")>();

    return {
        ...actual,
        scaleLinear: () => {
            const scale = actual.scaleLinear();
            const baseDomain = scale.domain.bind(scale);
            scale.domain = ((domain?: ReadonlyArray<number> | number) => {
                if (Array.isArray(domain)) {
                    scaleLinearDomainCalls.push([...domain]);
                }

                if (domain === undefined) {
                    return baseDomain();
                }

                return baseDomain(domain as Parameters<typeof baseDomain>[0]);
            }) as typeof scale.domain;

            return scale;
        },
    };
});

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const spec: BarErrorSpec = {
    version: 1,
    id: "bar-spec-1",
    createdAt: "2026-05-20T10:00:00.000Z",
    title: "Outcome by group",
    showLegend: false,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "barError",
    errorBarType: "sem",
    annotations: [],
};

const threeCategories: BarErrorPlotData = {
    kind: "barError",
    categories: [
        { label: "A", mean: 10, error: 1, n: 20 },
        { label: "B", mean: 14, error: 1.5, n: 25 },
        { label: "C", mean: 18, error: 2, n: 30 },
    ],
};

const installResizeObserver = (size?: { readonly width: number; readonly height: number }): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (el: Element): void => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            trigger([
                {
                    contentRect: {
                        width: size?.width ?? (rect.width || 400),
                        height: size?.height ?? (rect.height || 250),
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

const stableSpec: BarErrorSpec = spec;
const stableData: BarErrorPlotData = threeCategories;

describe("BarErrorChart", () => {
    beforeEach(() => {
        barErrorChartRenderCountForTest.value = 0;
        scaleLinearDomainCalls.length = 0;
        installResizeObserver();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Validates React Compiler memoization on stable props — acceptance criterion of LOUPE-10.
    it("does not re-render when parent state changes but spec and data stay referentially stable", async () => {
        const stableDims = { width: 400, height: 250 };
        vi.spyOn(useResizeObserverModule, "useResizeObserver").mockReturnValue([
            { current: null },
            stableDims,
        ]);

        const Parent = (): JSX.Element => {
            const [counter, setCounter] = useState(0);

            return (
                <div>
                    <BarErrorChart data={stableData} spec={stableSpec} />
                    <button type="button" onClick={() => setCounter((c) => c + 1)}>
                        {counter}
                    </button>
                </div>
            );
        };

        const { getByRole } = render(<Parent />);

        await waitFor(() => {
            expect(document.querySelector("rect.bar")).not.toBeNull();
        });

        expect(barErrorChartRenderCountForTest.value).toBe(1);

        fireEvent.click(getByRole("button"));
        fireEvent.click(getByRole("button"));
        fireEvent.click(getByRole("button"));

        expect(barErrorChartRenderCountForTest.value).toBe(1);
    });

    it("gives all-negative categories headroom above the largest mean", async () => {
        const allNegativeData: BarErrorPlotData = {
            kind: "barError",
            categories: [
                { label: "A", mean: -5, error: 1, n: 10 },
                { label: "B", mean: -8, error: 1.5, n: 12 },
            ],
        };
        const maxMean = Math.max(...allNegativeData.categories.map((c) => c.mean));

        render(<BarErrorChart data={allNegativeData} spec={spec} />);

        await waitFor(() => {
            expect(scaleLinearDomainCalls.length).toBeGreaterThan(0);
        });

        const domainTop = scaleLinearDomainCalls.at(-1)?.[1];
        expect(domainTop).toBeDefined();
        expect(domainTop as number).toBeGreaterThan(maxMean);
    });

    it("renders bars, error lines, axis labels, and aria-label", async () => {
        const { container } = render(
            <BarErrorChart data={threeCategories} spec={spec} />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(3);
        });

        expect(container.querySelectorAll("g.errors line")).toHaveLength(9);
        expect(container.querySelector("svg")?.getAttribute("aria-label")).toBe(spec.title);

        const labels = [...container.querySelectorAll("g.x-axis text")].map(
            (t) => t.firstChild?.textContent,
        );
        expect(labels).toEqual(expect.arrayContaining(["A", "B", "C"]));
    });

    it("updates bars when data changes", async () => {
        const twoCategories: BarErrorPlotData = {
            kind: "barError",
            categories: [
                { label: "X", mean: 5, error: 0.5, n: 10 },
                { label: "Y", mean: 8, error: 0.8, n: 12 },
            ],
        };

        const { container, rerender } = render(
            <BarErrorChart data={threeCategories} spec={spec} />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(3);
        });

        rerender(<BarErrorChart data={twoCategories} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(2);
        });
    });

    it("re-renders when resize observer reports new dimensions", async () => {
        const { container } = render(
            <div style={{ width: 300, height: 200 }}>
                <BarErrorChart data={threeCategories} spec={spec} />
            </div>,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar").length).toBeGreaterThan(0);
        });

        const firstWidth = container.querySelector("rect.bar")?.getAttribute("width");

        await act(async () => {
            trigger([
                {
                    contentRect: {
                        width: 600,
                        height: 400,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 400,
                        right: 600,
                        toJSON: () => ({}),
                    },
                } as ResizeObserverEntry,
            ]);
        });

        await waitFor(() => {
            const nextWidth = container.querySelector("rect.bar")?.getAttribute("width");
            expect(nextWidth).not.toBe(firstWidth);
        });
    });

    it("handles empty categories without crashing", async () => {
        const empty: BarErrorPlotData = { kind: "barError", categories: [] };
        const { container } = render(<BarErrorChart data={empty} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(0);
        });
        expect(container.querySelectorAll("g.errors line")).toHaveLength(0);
    });

    it("drops duplicate labels so bars and error caps stay paired", async () => {
        const duplicate: BarErrorPlotData = {
            kind: "barError",
            categories: [
                { label: "A", mean: 10, error: 1, n: 20 },
                { label: "A", mean: 12, error: 1.2, n: 22 },
                { label: "B", mean: 15, error: 1.5, n: 25 },
            ],
        };
        const { container } = render(<BarErrorChart data={duplicate} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(2);
        });
        expect(container.querySelectorAll("g.errors line")).toHaveLength(6);
    });

    it("truncates long x-axis labels and keeps full label in title", async () => {
        const longLabel = "Pembrolizumab_Response_At_12_Months";
        const data: BarErrorPlotData = {
            kind: "barError",
            categories: [
                { label: longLabel, mean: 10, error: 1, n: 20 },
                { label: "B", mean: 15, error: 1.5, n: 25 },
            ],
        };
        const { container } = render(<BarErrorChart data={data} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelector(".x-axis text")).not.toBeNull();
        });

        const tickText = container.querySelector(".x-axis text");
        expect(tickText?.firstChild?.textContent).not.toBe(longLabel);
        expect(tickText?.firstChild?.textContent?.endsWith("…")).toBe(true);
        expect(tickText?.querySelector("title")?.textContent).toBe(longLabel);
    });

    it("rotates x-axis labels when bands are narrower than 60px", async () => {
        installResizeObserver({ width: 400, height: 250 });
        const eight: BarErrorPlotData = {
            kind: "barError",
            categories: Array.from({ length: 8 }, (_, i) => ({
                label: `Group${i}`,
                mean: 10 + i,
                error: 1,
                n: 20,
            })),
        };
        const { container } = render(<BarErrorChart data={eight} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelector(".x-axis text")?.getAttribute("transform")).toContain(
                "rotate(-35)",
            );
        });
    });

    it("renders negative means upward from the zero baseline", async () => {
        const negative: BarErrorPlotData = {
            kind: "barError",
            categories: [{ label: "Loss", mean: -5, error: 1, n: 10 }],
        };
        const { container } = render(<BarErrorChart data={negative} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelector("rect.bar")).not.toBeNull();
        });

        const bar = container.querySelector("rect.bar");
        const y = Number(bar?.getAttribute("y"));
        const height = Number(bar?.getAttribute("height"));
        expect(height).toBeGreaterThan(0);
        expect(y + height).toBeLessThanOrEqual(250);
    });

    it("binds svg width, height, and viewBox to measured dimensions", async () => {
        installResizeObserver({ width: 400, height: 250 });
        const { container } = render(<BarErrorChart data={threeCategories} spec={spec} />);

        await waitFor(() => {
            const svg = container.querySelector("svg");
            expect(svg?.getAttribute("width")).toBe("400");
            expect(svg?.getAttribute("height")).toBe("250");
            expect(svg?.getAttribute("viewBox")).toBe("0 0 400 250");
        });
        expect(container.querySelector("svg")?.classList.contains("rec-chart-svg")).toBe(true);
    });

    it("does not rotate x-axis labels when bands are wide enough", async () => {
        installResizeObserver({ width: 1200, height: 400 });
        const { container } = render(<BarErrorChart data={threeCategories} spec={spec} />);

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar").length).toBeGreaterThan(0);
        });

        const transform = container.querySelector(".x-axis text")?.getAttribute("transform") ?? "";
        expect(transform.includes("rotate")).toBe(false);
    });
});
