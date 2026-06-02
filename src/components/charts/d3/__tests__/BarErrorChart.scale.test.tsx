// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GroupStats } from "@/lib/chartSpec/aggregators/barError.types";
import type { BarErrorSpec } from "@/lib/chartSpec/types";

import { BarErrorChart } from "../BarErrorChart";

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
    id: "bar-scale-spec",
    createdAt: "2026-06-02T08:00:00.000Z",
    title: "Bar scale test",
    showLegend: false,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "barError",
    errorBarType: "sd",
    annotations: [],
};

const installResizeObserver = (): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (): void => {
            trigger([
                {
                    contentRect: {
                        width: 420,
                        height: 320,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 320,
                        right: 420,
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

const latestDomain = async (): Promise<readonly [number, number]> => {
    await waitFor(() => {
        expect(scaleLinearDomainCalls.length).toBeGreaterThan(0);
    });

    const domain = scaleLinearDomainCalls.at(-1);
    if (domain === undefined || domain.length < 2) {
        throw new Error("expected y-domain capture");
    }

    return [domain[0], domain[1]];
};

describe("BarErrorChart - y-axis domain", () => {
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

    it("retains zero inside the domain when all group means are negative", async () => {
        const allNegative: readonly GroupStats[] = [
            { label: "A", mean: -5, sd: 1, n: 12 },
            { label: "B", mean: -8, sd: 2, n: 10 },
        ];

        render(<BarErrorChart spec={spec} groups={allNegative} />);
        const [domainLo, domainHi] = await latestDomain();

        expect(domainLo).toBeLessThan(0);
        expect(domainHi).toBeGreaterThan(0);
    });

    it("produces a non-degenerate finite scale when all values are constant", async () => {
        const constant: readonly GroupStats[] = [
            { label: "A", mean: 6, sd: 0, n: 20 },
            { label: "B", mean: 6, sd: 0, n: 20 },
            { label: "C", mean: 6, sd: 0, n: 20 },
        ];

        render(<BarErrorChart spec={spec} groups={constant} />);
        const [domainLo, domainHi] = await latestDomain();

        expect(Number.isFinite(domainLo)).toBe(true);
        expect(Number.isFinite(domainHi)).toBe(true);
        expect(domainLo).not.toBe(domainHi);
    });

    it("renders without NaN in scale when n=1 (no error bar)", async () => {
        const single: readonly GroupStats[] = [{ label: "Solo", mean: 5, sd: 2, n: 1 }];
        const { container } = render(<BarErrorChart spec={spec} groups={single} />);
        const [domainLo, domainHi] = await latestDomain();

        expect(Number.isNaN(domainLo)).toBe(false);
        expect(Number.isNaN(domainHi)).toBe(false);
        expect(container.querySelectorAll("g.errors line")).toHaveLength(0);
    });

    // MUTATION-VERIFY:
    //   src/components/charts/d3/BarErrorChart.tsx:81-84
    //   - const yHi = Math.max(0, max(groups, (c) => c.mean + computeErrorBar(c, spec.errorBarType)) ?? 0);
    //   + const yHi = max(groups, (c) => c.mean + computeErrorBar(c, spec.errorBarType)) ?? 0;
    //   Test: "retains zero inside the domain when all group means are negative" goes RED.
    //   Verified manually: 2026-06-02. REVERTED.
});
