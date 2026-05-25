// @vitest-environment happy-dom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LoupeDataset } from "@/app/providers";
import { createRoutedChartSpec } from "@/lib/chartSpec/factory";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows } from "@/lib/parser/types";
import type { Receipt } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import * as providers from "@/app/providers";

import { Recommendation } from "../Recommendation";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const appendOverride = vi.fn();
const setSelectionMode = vi.fn();
const updateLatestOverrideReason = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { push: ReturnType<typeof vi.fn>; replace: ReturnType<typeof vi.fn> } => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
}));

vi.mock("@/app/providers", () => ({
    useAppState: vi.fn(),
}));

const stubAppState = (mapping: Mapping): void => {
    vi.mocked(providers.useAppState).mockReturnValue({
        appendOverride,
        intent: "",
        mapping,
        setSelectionMode,
        updateLatestOverrideReason,
    } as never);
};

const buildGlp1Dataset = (): LoupeDataset => {
    const patientCount = 60;
    const visits = [0, 3, 6, 9, 12];
    const rows: Record<string, string>[] = [];
    for (let patient = 0; patient < patientCount; patient += 1) {
        for (const visit of visits) {
            if (patient % 10 === 0 && visit === 12) {
                continue;
            }
            rows.push({
                hba1c_percent: String(8 - visit * 0.05 + (patient % 2) * 0.1),
                patient_id: `P${patient}`,
                treatment_arm: patient % 2 === 0 ? "GLP-1 RA" : "Standard care",
                visit_month: String(visit),
            });
        }
    }

    const inferences: readonly ColumnInference[] = [
        {
            confidence: 1,
            name: "patient_id",
            nullCount: 0,
            primaryType: "categorical",
            reasons: [],
            sampleValues: [],
            semanticTag: "patient-id",
            uniqueCount: patientCount,
        },
        {
            confidence: 1,
            name: "treatment_arm",
            nullCount: 0,
            primaryType: "categorical",
            reasons: [],
            sampleValues: [],
            uniqueCount: 2,
        },
        {
            confidence: 1,
            name: "visit_month",
            nullCount: 0,
            primaryType: "integer",
            reasons: [],
            sampleValues: [],
            uniqueCount: visits.length,
        },
        {
            confidence: 1,
            name: "hba1c_percent",
            nullCount: 0,
            primaryType: "numeric",
            reasons: [],
            sampleValues: [],
            uniqueCount: 40,
        },
    ];

    return {
        inferences,
        rows: brandRows(rows),
    };
};

const buildScatterDataset = (): LoupeDataset => {
    const rows = brandRows(
        Array.from({ length: 120 }, (_, index) => ({
            cimt_mm: String(0.8 + index * 0.001),
            ldl_cholesterol: String(100 + index),
            patient_id: `P${index}`,
            smoker: index % 2 === 0 ? "Yes" : "No",
        })),
    );
    const inferences: readonly ColumnInference[] = [
        {
            confidence: 1,
            name: "patient_id",
            nullCount: 0,
            primaryType: "categorical",
            reasons: [],
            sampleValues: [],
            uniqueCount: 120,
        },
        {
            confidence: 1,
            name: "smoker",
            nullCount: 0,
            primaryType: "binary",
            reasons: [],
            sampleValues: [],
            uniqueCount: 2,
        },
        {
            confidence: 1,
            name: "ldl_cholesterol",
            nullCount: 0,
            primaryType: "numeric",
            reasons: [],
            sampleValues: [],
            uniqueCount: 120,
        },
        {
            confidence: 1,
            name: "cimt_mm",
            nullCount: 0,
            primaryType: "numeric",
            reasons: [],
            sampleValues: [],
            uniqueCount: 120,
        },
    ];

    return { inferences, rows };
};

const scatterMapping: Mapping = {
    group: "smoker",
    x: "ldl_cholesterol",
    y: "cimt_mm",
};

const sampleReceipt = (): Receipt => ({
    alternatives: [],
    intent: "Trial arms over visits",
    overrides: [],
    recommendation: {
        because: "Because body.",
        becauseTitle: "Because",
        chartName: "XY plot",
        handles: "Handles body.",
        handlesTitle: "Handles",
        headline: "Add trend lines for each treatment group",
    },
    selectionMode: "ai",
    tests: [],
    testsTitle: "Tests",
    transformations: [{ chart: "line chart.", verb: "becomes a" }],
});

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

const advanceToChartPhase = async (): Promise<void> => {
    await act(async () => {
        vi.advanceTimersByTime(700);
    });
};

describe("Recommendation longitudinal routing", () => {
    let bboxSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
            cb(0);
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", (): void => undefined);
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
        vi.restoreAllMocks();
        vi.useRealTimers();
        bboxSpy?.mockRestore();
        cleanup();
    });

    it("routes longitudinal CSV to line chart, not scatter, on the glp1_trial_hba1c shape", async () => {
        const dataset = buildGlp1Dataset();
        const mapping: Mapping = {
            group: "treatment_arm",
            id: "patient_id",
            x: "visit_month",
            y: "hba1c_percent",
        };
        stubAppState(mapping);
        const routed = createRoutedChartSpec("xy", {
            inferences: dataset.inferences,
            mapping,
            rows: dataset.rows,
        });
        expect(routed.spec.kind).toBe("xy");
        if (routed.spec.kind !== "xy") {
            throw new Error("expected xy spec");
        }
        expect(routed.spec.mode).toBe("line");

        render(
            <Recommendation
                chartKind="xy"
                dataset={dataset}
                fromCache={false}
                receipt={sampleReceipt()}
                spec={routed.spec}
            />,
        );

        await advanceToChartPhase();
        await act(async () => {
            await Promise.resolve();
        });

        vi.useRealTimers();
        await waitFor(() => {
            const lines = document.querySelectorAll('[data-role="xy-line"]');
            const markers = document.querySelectorAll('[data-role="xy-marker"]');
            expect(lines).toHaveLength(2);
            expect(markers).toHaveLength(0);
        });
    });

    it("routes true scatter CSV to scatter mode on the ldl_cimt_cohort shape", async () => {
        const dataset = buildScatterDataset();
        stubAppState(scatterMapping);
        const routed = createRoutedChartSpec("xy", {
            inferences: dataset.inferences,
            mapping: scatterMapping,
            rows: dataset.rows,
        });
        expect(routed.spec.kind).toBe("xy");
        if (routed.spec.kind !== "xy") {
            throw new Error("expected xy spec");
        }
        expect(routed.spec.mode).toBe("scatter");

        render(
            <Recommendation
                chartKind="xy"
                dataset={dataset}
                fromCache={false}
                receipt={sampleReceipt()}
                spec={routed.spec}
            />,
        );

        await advanceToChartPhase();
        await act(async () => {
            await Promise.resolve();
        });

        vi.useRealTimers();
        await waitFor(() => {
            const markers = document.querySelectorAll('[data-role="xy-marker"]');
            expect(markers.length).toBeGreaterThanOrEqual(120);
            expect(document.querySelectorAll('[data-role="xy-line"]')).toHaveLength(0);
        });
    });
});
