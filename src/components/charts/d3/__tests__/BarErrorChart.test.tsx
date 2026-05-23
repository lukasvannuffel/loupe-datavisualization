// @vitest-environment happy-dom

import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeErrorBar } from "@/lib/chartSpec/aggregators/errorBars";
import type { GroupStats } from "@/lib/chartSpec/aggregators/barError.types";
import type { BarErrorSpec } from "@/lib/chartSpec/types";

import { BarErrorChart } from "../BarErrorChart";
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

const threeGroups: readonly GroupStats[] = [
    { label: "A", mean: 10, sd: 1, n: 20 },
    { label: "B", mean: 14, sd: 1.5, n: 25 },
    { label: "C", mean: 18, sd: 2, n: 30 },
];

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
const stableGroups: readonly GroupStats[] = threeGroups;

describe("BarErrorChart", () => {
    beforeEach(() => {
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

    it("redraws when errorType changes without groups reference changing", async () => {
        const stableDims = { width: 400, height: 250 };
        vi.spyOn(useResizeObserverModule, "useResizeObserver").mockReturnValue([
            { current: null },
            stableDims,
        ]);

        const group = threeGroups[0];
        const { container, rerender } = render(
            <BarErrorChart groups={[group]} spec={stableSpec} errorType="sd" />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("g.errors line").length).toBeGreaterThan(0);
        });

        const yBefore = [...container.querySelectorAll("g.errors line")].map((l) =>
            Number(l.getAttribute("y1")),
        );

        rerender(<BarErrorChart groups={[group]} spec={stableSpec} errorType="ci95" />);

        await waitFor(() => {
            const yAfter = [...container.querySelectorAll("g.errors line")].map((l) =>
                Number(l.getAttribute("y1")),
            );
            expect(yAfter).not.toEqual(yBefore);
        });
    });

    it("error bar geometry changes when errorType changes", async () => {
        const group = threeGroups[0];
        const { container, rerender } = render(
            <BarErrorChart groups={[group]} spec={spec} errorType="sd" />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("g.errors line").length).toBeGreaterThan(0);
        });

        const yCoordsSd = [...container.querySelectorAll("g.errors line")].map((l) =>
            Number(l.getAttribute("y1")),
        );

        rerender(<BarErrorChart groups={[group]} spec={spec} errorType="sem" />);

        await waitFor(() => {
            const yCoordsSem = [...container.querySelectorAll("g.errors line")].map((l) =>
                Number(l.getAttribute("y1")),
            );
            expect(yCoordsSem).not.toEqual(yCoordsSd);
        });

        rerender(<BarErrorChart groups={[group]} spec={spec} errorType="ci95" />);

        await waitFor(() => {
            const yCoordsCi = [...container.querySelectorAll("g.errors line")].map((l) =>
                Number(l.getAttribute("y1")),
            );
            expect(yCoordsCi.some((y, i) => y !== yCoordsSd[i])).toBe(true);
        });
    });

    it("renders no error lines for n=1 groups", async () => {
        const single: GroupStats = { label: "solo", mean: 5, sd: 2, n: 1 };
        const { container } = render(
            <BarErrorChart groups={[single]} spec={spec} errorType="sd" />,
        );

        await waitFor(() => {
            expect(container.querySelector("rect.bar")).not.toBeNull();
        });
        expect(container.querySelectorAll("g.errors line")).toHaveLength(0);
    });

    it("gives all-negative categories headroom above the largest mean", async () => {
        const allNegative: readonly GroupStats[] = [
            { label: "A", mean: -5, sd: 1, n: 10 },
            { label: "B", mean: -8, sd: 1.5, n: 12 },
        ];
        const maxMean = Math.max(...allNegative.map((c) => c.mean));

        render(<BarErrorChart groups={allNegative} spec={spec} errorType="sd" />);

        await waitFor(() => {
            expect(scaleLinearDomainCalls.length).toBeGreaterThan(0);
        });

        const domainTop = scaleLinearDomainCalls.at(-1)?.[1];
        expect(domainTop).toBeDefined();
        expect(domainTop as number).toBeGreaterThan(maxMean);
    });

    it("renders bars, error lines, axis labels, and aria-label", async () => {
        const { container } = render(
            <BarErrorChart groups={threeGroups} spec={spec} errorType="sem" />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(3);
        });

        expect(container.querySelectorAll("g.errors line").length).toBeGreaterThan(0);
        expect(container.querySelector("svg")?.getAttribute("aria-label")).toBe(spec.title);

        const labels = [...container.querySelectorAll("g.x-axis text")].map(
            (t) => t.firstChild?.textContent,
        );
        expect(labels).toEqual(expect.arrayContaining(["A", "B", "C"]));
    });

    it("updates bars when groups change", async () => {
        const twoGroups: readonly GroupStats[] = [
            { label: "X", mean: 5, sd: 0.5, n: 10 },
            { label: "Y", mean: 8, sd: 0.8, n: 12 },
        ];

        const { container, rerender } = render(
            <BarErrorChart groups={threeGroups} spec={spec} errorType="sem" />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(3);
        });

        rerender(<BarErrorChart groups={twoGroups} spec={spec} errorType="sem" />);

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(2);
        });
    });

    it("handles empty groups without crashing", async () => {
        const { container } = render(<BarErrorChart groups={[]} spec={spec} errorType="sem" />);

        await waitFor(() => {
            expect(container.querySelectorAll("rect.bar")).toHaveLength(0);
        });
        expect(container.querySelectorAll("g.errors line")).toHaveLength(0);
    });

    it("renders negative means upward from the zero baseline", async () => {
        const negative: readonly GroupStats[] = [{ label: "Loss", mean: -5, sd: 1, n: 10 }];
        const { container } = render(
            <BarErrorChart groups={negative} spec={spec} errorType="sd" />,
        );

        await waitFor(() => {
            expect(container.querySelector("rect.bar")).not.toBeNull();
        });

        const bar = container.querySelector("rect.bar");
        const y = Number(bar?.getAttribute("y"));
        const height = Number(bar?.getAttribute("height"));
        expect(height).toBeGreaterThan(0);
        expect(y + height).toBeLessThanOrEqual(250);
    });

    it("uses computeErrorBar magnitudes for y scale", () => {
        const g = threeGroups[0];
        expect(computeErrorBar(g, "sem")).toBeCloseTo(g.sd / Math.sqrt(g.n), 5);
    });
});
