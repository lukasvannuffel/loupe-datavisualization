import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";

import { chartSpecSchema, plotDataSchema, receiptSchema } from "../schemas";
import {
    MANUAL_SELECTION_NOTE,
    manualSelectionNoteFor,
    type BarErrorPlotData,
    type BarErrorSpec,
    type BoxPlotData,
    type BoxSpec,
    type ChartSpec,
    type KMPlotData,
    type KMSpec,
    type PlotData,
    type Receipt,
    type XYPlotData,
    type XYSpec,
} from "../types";

const ISO_NOW = "2026-05-06T12:34:56.000Z";

const baseFields = {
    version: 1 as const,
    id: "spec-1",
    createdAt: ISO_NOW,
    title: "Title",
    showLegend: true,
    showGrid: false,
    paletteId: "monochrome",
    strokeWeight: 1.5,
};

const kmSpec: KMSpec = {
    ...baseFields,
    kind: "km",
    legendA: "Treatment",
    legendB: "Control",
    dashB: true,
    showAtRisk: true,
    showStats: false,
    timeUnit: "months",
};

const barErrorSpec: BarErrorSpec = {
    ...baseFields,
    kind: "barError",
    errorBarType: "ci95",
    annotations: [
        { kind: "bracket", from: 0, to: 1, label: "*", level: 1, pValue: 0.04 },
        { kind: "pLabel", target: 2, pValue: 0.001 },
    ],
};

const boxSpec: BoxSpec = {
    ...baseFields,
    kind: "box",
    showOutliers: true,
    showMeanMarker: true,
    groupOrder: "alphabetical",
};

const xySpecLine: XYSpec = {
    ...baseFields,
    kind: "xy",
    mode: "line",
    showRegression: true,
    regressionType: "linear",
    showCorrelation: false,
};

const xySpecScatter: XYSpec = {
    ...baseFields,
    id: "spec-xy-scatter",
    kind: "xy",
    mode: "scatter",
    showRegression: true,
    showCorrelation: false,
};

const xySpecScatterLine: XYSpec = {
    ...baseFields,
    id: "spec-xy-scatter-line",
    kind: "xy",
    mode: "scatterLine",
    showRegression: false,
    showCorrelation: true,
};

const kmPlotData: KMPlotData = {
    kind: "km",
    groups: [
        {
            label: "A",
            points: [
                { time: 0, survival: 1, atRisk: 100, censored: 0 },
                { time: 12, survival: 0.82, atRisk: 78, censored: 4 },
            ],
            median: 36,
            ci: [{ time: 12, lower: 0.74, upper: 0.9 }],
        },
    ],
};

const barErrorPlotData: BarErrorPlotData = {
    kind: "barError",
    categories: [
        { label: "Arm A", mean: 12.4, error: 1.2, n: 80 },
        { label: "Arm B", mean: 9.7, error: 1.4, n: 78 },
    ],
};

const boxPlotData: BoxPlotData = {
    kind: "box",
    groups: [
        {
            label: "A",
            min: 0,
            q1: 1,
            median: 2,
            q3: 3,
            max: 4,
            outliers: [],
            n: 10,
        },
    ],
};

const xyPlotData: XYPlotData = {
    kind: "xy",
    series: [
        {
            label: "Series A",
            points: [{ x: 0, y: 1 }],
        },
    ],
};

const boxPlotDataWithOutliers: BoxPlotData = {
    kind: "box",
    groups: [
        {
            label: "A",
            max: 5,
            min: 0,
            n: 10,
            outliers: [4.5, 4.9],
            q1: 1,
            q3: 3,
            median: 2,
        },
    ],
};

const boxPlotDataEmptyOutliers: BoxPlotData = {
    kind: "box",
    groups: [
        {
            label: "B",
            max: 5,
            min: 1,
            n: 5,
            outliers: [],
            q1: 2,
            q3: 4,
            median: 3,
        },
    ],
};

const xyPlotDataLine: XYPlotData = {
    kind: "xy",
    series: [
        {
            label: "Arm A",
            points: [
                { x: 0, y: 1 },
                { x: 1, y: 2 },
            ],
        },
        {
            label: "Arm B",
            points: [
                { x: 0, y: 2 },
                { x: 1, y: 3 },
            ],
        },
    ],
};

const xyPlotDataScatterRegression: XYPlotData = {
    kind: "xy",
    series: [
        {
            label: "Obs",
            points: [
                { x: 1, y: 4 },
                { x: 2, y: 7 },
            ],
        },
    ],
    regression: {
        intercept: 0.41,
        slope: 3.42,
    },
};

const receipt: Receipt = {
    intent: "Compare 5-year survival between treatment arms",
    overrides: [],
    selectionMode: "ai",
    recommendation: {
        chartName: "Kaplan-Meier curve",
        headline: "Kaplan-Meier was the right shape for this finding.",
        becauseTitle: "Because",
        because: "Time-to-event question with censoring.",
        handlesTitle: "It handles censoring",
        handles: "Of 610 patients, 218 were censored before 60 months.",
    },
    alternatives: [
        { slug: "forest", name: "Forest plot", reason: "Better for many subgroups." },
        { slug: "barError", name: "Bar with error bars", reason: "Better when no time axis." },
    ],
    transformations: [
        { verb: "becomes a", chart: "Kaplan-Meier curve." },
    ],
    testsTitle: "Tests we ran on your data",
    tests: [
        { label: "log-rank p < 0.001" },
        {
            label: "Cox HR 0.74 (95% CI 0.61-0.89)",
            name: "Cox proportional hazards",
            statistic: 0.74,
            ci95: [0.61, 0.89],
            pValue: 0.0008,
            notes: "Schoenfeld residuals: PH assumption holds.",
        },
    ],
};

const roundTrip = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

const exactPaths = (issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }>): string[] =>
    issues.map((i) => i.path.join("."));

describe("chartSpecSchema round-trip", () => {
    it.each<[string, ChartSpec]>([
        ["km", kmSpec],
        ["barError", barErrorSpec],
        ["box", boxSpec],
    ])("preserves %s spec across JSON round-trip", (_kind, fixture) => {
        const parsed = chartSpecSchema.parse(roundTrip(fixture));
        expect(parsed).toEqual(fixture);
    });

    it("preserves xy spec (line mode) across JSON round-trip", () => {
        expect(chartSpecSchema.parse(roundTrip(xySpecLine))).toEqual(xySpecLine);
    });

    it("preserves xy spec (scatter mode) across JSON round-trip", () => {
        expect(chartSpecSchema.parse(roundTrip(xySpecScatter))).toEqual(xySpecScatter);
    });

    it("preserves xy spec (scatterLine mode) across JSON round-trip", () => {
        expect(chartSpecSchema.parse(roundTrip(xySpecScatterLine))).toEqual(xySpecScatterLine);
    });
});

describe("plotDataSchema round-trip", () => {
    it.each<[string, PlotData]>([
        ["km", kmPlotData],
        ["barError", barErrorPlotData],
        ["box", boxPlotData],
        ["xy", xyPlotData],
    ])("preserves %s plot data across JSON round-trip", (_kind, fixture) => {
        const parsed = plotDataSchema.parse(roundTrip(fixture));
        expect(parsed).toEqual(fixture);
    });

    it("preserves box plot data with outliers (order preserved)", () => {
        const parsed = plotDataSchema.parse(roundTrip(boxPlotDataWithOutliers));
        expect(parsed).toEqual(boxPlotDataWithOutliers);
        if (parsed.kind === "box") {
            expect(parsed.groups[0]?.outliers).toEqual([4.5, 4.9]);
        }
    });

    it("preserves box plot data with empty outliers", () => {
        const parsed = plotDataSchema.parse(roundTrip(boxPlotDataEmptyOutliers));
        expect(parsed).toEqual(boxPlotDataEmptyOutliers);
    });

    it("preserves xy plot data (line-style multi-series)", () => {
        const parsed = plotDataSchema.parse(roundTrip(xyPlotDataLine));
        expect(parsed).toEqual(xyPlotDataLine);
    });

    it("preserves xy plot data (scatter + regression at plot level)", () => {
        const parsed = plotDataSchema.parse(roundTrip(xyPlotDataScatterRegression));
        expect(parsed).toEqual(xyPlotDataScatterRegression);
        if (parsed.kind === "xy") {
            expect(parsed.regression).toEqual({
                slope: 3.42,
                intercept: 0.41,
            });
        }
    });
});

describe("ChartSpec discriminant", () => {
    it("pins the closed set of `kind` literals on ChartSpec", () => {
        expectTypeOf<ChartSpec["kind"]>().toEqualTypeOf<"km" | "barError" | "box" | "xy">();
    });
});

describe("receiptSchema round-trip", () => {
    it("preserves a Receipt with multiple alternatives and a fully-structured StatTest", () => {
        const parsed = receiptSchema.parse(roundTrip(receipt));
        expect(parsed).toEqual(receipt);
        expect(parsed.alternatives.length).toBeGreaterThanOrEqual(2);
        expect(parsed.tests.some((t) => t.ci95 !== undefined && t.statistic !== undefined)).toBe(true);
    });
});

describe("Receipt.selectionMode", () => {
    it("a manual receipt serializes the explicit note string", () => {
        const manualReceipt: Receipt = {
            ...receipt,
            selectionMode: "manual",
            manualSelectionNote: manualSelectionNoteFor("manual"),
        };
        const parsed = receiptSchema.parse(roundTrip(manualReceipt));
        expect(parsed.selectionMode).toBe("manual");
        expect(parsed.manualSelectionNote).toBe(MANUAL_SELECTION_NOTE);
        expect(MANUAL_SELECTION_NOTE).toBe(
            "User selected chart type manually (no AI recommendation requested)",
        );
    });

    it("an AI receipt does NOT include the manual-selection note", () => {
        const parsed = receiptSchema.parse(roundTrip(receipt));
        expect(parsed.selectionMode).toBe("ai");
        expect(parsed.manualSelectionNote).toBeUndefined();
        expect(manualSelectionNoteFor("ai")).toBeUndefined();
    });

    it("rejects a manual receipt missing the note", () => {
        const broken: unknown = { ...receipt, selectionMode: "manual" };
        const result = receiptSchema.safeParse(broken);
        expect(result.success).toBe(false);
    });

    it("rejects an AI receipt that smuggles a manual note", () => {
        const broken: unknown = { ...receipt, manualSelectionNote: MANUAL_SELECTION_NOTE };
        const result = receiptSchema.safeParse(broken);
        expect(result.success).toBe(false);
    });
});

describe("schema rejection — exact paths", () => {
    it("rejects a spec with no `kind`", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, kind: undefined });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("kind");
        }
    });

    it("rejects a spec with an unknown `kind`", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, kind: "scatter" });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("kind");
        }
    });

    it("rejects version: 2 at exactly the version path", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, version: 2 });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("version");
        }
    });

    it("rejects negative strokeWeight at exactly the strokeWeight path", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, strokeWeight: -1 });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("strokeWeight");
        }
    });

    it("rejects empty `id` at exactly the id path (C6 — empty strings)", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, id: "" });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("id");
        }
    });

    it("rejects empty `paletteId` at exactly the paletteId path", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, paletteId: "" });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("paletteId");
        }
    });

    it("rejects box PlotData when q1 > q3 (five-number summary order)", () => {
        const broken: unknown = {
            kind: "box",
            groups: [
                {
                    label: "A",
                    min: 0,
                    q1: 5,
                    median: 3,
                    q3: 2,
                    max: 10,
                    outliers: [],
                    n: 10,
                },
            ],
        };
        const result = plotDataSchema.safeParse(broken);
        expect(result.success).toBe(false);
    });

    it("rejects xy PlotData when a series has empty points", () => {
        const broken: unknown = {
            kind: "xy",
            series: [{ label: "Empty", points: [] }],
        };
        const result = plotDataSchema.safeParse(broken);
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("series.0.points");
        }
    });

    it("rejects an unknown key nested on a box group (strict object)", () => {
        const broken: unknown = {
            kind: "box",
            groups: [
                {
                    label: "A",
                    min: 0,
                    q1: 1,
                    median: 2,
                    q3: 3,
                    max: 4,
                    outliers: [],
                    n: 10,
                    patientId: "p1",
                },
            ],
        };
        const result = plotDataSchema.safeParse(broken);
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("groups.0");
            const unrecognized = result.error.issues.find((i) => i.code === "unrecognized_keys");
            expect(
                unrecognized && "keys" in unrecognized && unrecognized.keys,
            ).toContain("patientId");
        }
    });
});

// C4 — privacy at runtime. Schemas are .strict(): unknown keys (especially shapes
// that smell like raw rows) MUST be rejected, not silently stripped. The compile-time
// privacy guard below is a developer aid; this is the runtime enforcement.
describe("privacy — schema rejects smuggled per-patient fields", () => {
    it("plotDataSchema rejects an extra `rows` key on a KM payload", () => {
        const smuggled = {
            kind: "km",
            groups: [
                {
                    label: "A",
                    points: [{ time: 0, survival: 1, atRisk: 1, censored: 0 }],
                },
            ],
            rows: [{ patientId: "p1", time: 12, event: 1 }],
        };
        const result = plotDataSchema.safeParse(smuggled);
        expect(result.success).toBe(false);

        if (!result.success) {
            const unrecognized = result.error.issues.find(
                (i) => i.code === "unrecognized_keys",
            ) as { code: "unrecognized_keys"; keys: string[] } | undefined;
            expect(unrecognized).toBeDefined();
            expect(unrecognized?.keys).toContain("rows");
        }
    });

    it("plotDataSchema rejects an extra `patientId` on a box group", () => {
        const smuggled = {
            kind: "box",
            groups: [
                {
                    label: "x",
                    min: 0,
                    q1: 1,
                    median: 2,
                    q3: 3,
                    max: 4,
                    outliers: [],
                    n: 10,
                    patientId: "p1",
                },
            ],
        };
        const result = plotDataSchema.safeParse(smuggled);
        expect(result.success).toBe(false);

        if (!result.success) {
            const unrecognized = result.error.issues.find(
                (i) => i.code === "unrecognized_keys",
            ) as { code: "unrecognized_keys"; keys: string[] } | undefined;
            expect(unrecognized).toBeDefined();
            expect(unrecognized?.keys).toContain("patientId");
        }
    });

    it("plotDataSchema rejects top-level `records` on a box payload", () => {
        const smuggled = {
            kind: "box",
            groups: boxPlotDataEmptyOutliers.groups,
            records: [{ id: "r1" }],
        };
        const result = plotDataSchema.safeParse(smuggled);
        expect(result.success).toBe(false);

        if (!result.success) {
            const unrecognized = result.error.issues.find(
                (i) => i.code === "unrecognized_keys",
            ) as { code: "unrecognized_keys"; keys: string[] } | undefined;
            expect(unrecognized).toBeDefined();
            expect(unrecognized?.keys).toContain("records");
        }
    });

    it("chartSpecSchema rejects unknown top-level keys", () => {
        const smuggled = { ...kmSpec, raw: "should not pass" };
        const result = chartSpecSchema.safeParse(smuggled);
        expect(result.success).toBe(false);
    });
});

describe("removed kinds — plotDataSchema + chartSpecSchema", () => {
    it("rejects legacy kind `roc` on PlotData", () => {
        const legacy: unknown = {
            kind: "roc",
            curves: [],
        };
        expect(plotDataSchema.safeParse(legacy).success).toBe(false);
    });

    it("rejects legacy kind `forest` on PlotData", () => {
        const legacy: unknown = {
            kind: "forest",
            subgroups: [],
        };
        expect(plotDataSchema.safeParse(legacy).success).toBe(false);
    });

    it("rejects legacy kind `roc` on ChartSpec", () => {
        const legacy: unknown = {
            ...baseFields,
            kind: "roc",
            showAuc: true,
            showDiagonalRef: true,
        };
        expect(chartSpecSchema.safeParse(legacy).success).toBe(false);
    });

    it("rejects legacy kind `forest` on ChartSpec", () => {
        const legacy: unknown = {
            ...baseFields,
            kind: "forest",
            showPooled: true,
            showHeterogeneity: false,
            nullValue: 1,
        };
        expect(chartSpecSchema.safeParse(legacy).success).toBe(false);
    });
});

// C5 — pin the optional-vs-null contract. AI / saved JSON must omit absent fields,
// not represent them as `null`. Documenting this as a hard contract before LOUPE-06
// (AI structured output) and LOUPE-17 (save action) consume the schema.
describe("optional fields contract", () => {
    it("rejects `caption: null` (must be omitted, not nulled)", () => {
        const result = chartSpecSchema.safeParse({ ...kmSpec, caption: null });
        expect(result.success).toBe(false);

        if (!result.success) {
            expect(exactPaths(result.error.issues)).toContain("caption");
        }
    });

    it("accepts the spec with `caption` omitted entirely", () => {
        const { ...minimal } = kmSpec;
        const result = chartSpecSchema.safeParse(minimal);
        expect(result.success).toBe(true);
    });
});

// C1 — schema↔type symmetry: `toExtend` (bidirectional) catches value-type drift,
// `keyof` exact equality catches presence/absence drift on optional fields that
// `toExtend` cannot see. We avoid `toEqualTypeOf` here because Zod's `.optional()`
// infers as `key?: T | undefined` while the TS spelling is `key?: T` — behaviorally
// identical without `exactOptionalPropertyTypes`, but `toEqualTypeOf`'s strict
// identity check rejects them. The combined `toExtend` + `keyof` guard catches every
// drift that matters at runtime: missing/added fields, type mismatches on values.
describe("schema ↔ type symmetry — per variant", () => {
    type InferredChartSpec = z.infer<typeof chartSpecSchema>;
    type InferredPlotData = z.infer<typeof plotDataSchema>;
    type InferredReceipt = z.infer<typeof receiptSchema>;
    type InferredKM = Extract<InferredChartSpec, { kind: "km" }>;
    type InferredBarError = Extract<InferredChartSpec, { kind: "barError" }>;
    type InferredBox = Extract<InferredChartSpec, { kind: "box" }>;
    type InferredXy = Extract<InferredChartSpec, { kind: "xy" }>;
    type InferredKMPlot = Extract<InferredPlotData, { kind: "km" }>;
    type InferredBarErrorPlot = Extract<InferredPlotData, { kind: "barError" }>;
    type InferredBoxPlot = Extract<InferredPlotData, { kind: "box" }>;
    type InferredXyPlot = Extract<InferredPlotData, { kind: "xy" }>;

    it("ChartSpec variants are bidirectionally assignable per kind", () => {
        expectTypeOf<InferredKM>().toExtend<KMSpec>();
        expectTypeOf<KMSpec>().toExtend<InferredKM>();
        expectTypeOf<InferredBarError>().toExtend<BarErrorSpec>();
        expectTypeOf<BarErrorSpec>().toExtend<InferredBarError>();
        expectTypeOf<InferredBox>().toExtend<BoxSpec>();
        expectTypeOf<BoxSpec>().toExtend<InferredBox>();
        expectTypeOf<InferredXy>().toExtend<XYSpec>();
        expectTypeOf<XYSpec>().toExtend<InferredXy>();
    });

    it("ChartSpec variant keys match exactly (catches optional-field drift)", () => {
        expectTypeOf<keyof InferredKM>().toEqualTypeOf<keyof KMSpec>();
        expectTypeOf<keyof InferredBarError>().toEqualTypeOf<keyof BarErrorSpec>();
        expectTypeOf<keyof InferredBox>().toEqualTypeOf<keyof BoxSpec>();
        expectTypeOf<keyof InferredXy>().toEqualTypeOf<keyof XYSpec>();
    });

    it("PlotData variants are bidirectionally assignable per kind", () => {
        expectTypeOf<InferredKMPlot>().toExtend<KMPlotData>();
        expectTypeOf<KMPlotData>().toExtend<InferredKMPlot>();
        expectTypeOf<InferredBarErrorPlot>().toExtend<BarErrorPlotData>();
        expectTypeOf<BarErrorPlotData>().toExtend<InferredBarErrorPlot>();
        expectTypeOf<InferredBoxPlot>().toExtend<BoxPlotData>();
        expectTypeOf<BoxPlotData>().toExtend<InferredBoxPlot>();
        expectTypeOf<InferredXyPlot>().toExtend<XYPlotData>();
        expectTypeOf<XYPlotData>().toExtend<InferredXyPlot>();
    });

    it("PlotData variant keys match exactly", () => {
        expectTypeOf<keyof InferredKMPlot>().toEqualTypeOf<keyof KMPlotData>();
        expectTypeOf<keyof InferredBarErrorPlot>().toEqualTypeOf<keyof BarErrorPlotData>();
        expectTypeOf<keyof InferredBoxPlot>().toEqualTypeOf<keyof BoxPlotData>();
        expectTypeOf<keyof InferredXyPlot>().toEqualTypeOf<keyof XYPlotData>();
    });

    it("Receipt and its nested blocks match by keys (catches optional-field drift)", () => {
        expectTypeOf<InferredReceipt>().toExtend<Receipt>();
        expectTypeOf<keyof InferredReceipt>().toEqualTypeOf<keyof Receipt>();
        expectTypeOf<keyof InferredReceipt["recommendation"]>().toEqualTypeOf<
            keyof Receipt["recommendation"]
        >();
        expectTypeOf<keyof InferredReceipt["alternatives"][number]>().toEqualTypeOf<
            keyof Receipt["alternatives"][number]
        >();
        expectTypeOf<keyof InferredReceipt["transformations"][number]>().toEqualTypeOf<
            keyof Receipt["transformations"][number]
        >();
        expectTypeOf<keyof InferredReceipt["tests"][number]>().toEqualTypeOf<
            keyof Receipt["tests"][number]
        >();
    });
});

// Privacy guard — type-level. PlotData must NOT expose any field whose name suggests
// per-patient data. If you ever introduce `row`, `rows`, `patient`, `patientId`,
// `subjectId`, or `raw` into a PlotData variant, `_privacyGuard` will fail to compile.
// Reason: LOUPE-17 (saveChart) and the product privacy claim depend on PlotData being
// purely aggregated. The runtime Zod schema (privacy describe block above) is the
// second line of defence.
type _DeepKeys<T> = T extends readonly (infer U)[]
    ? _DeepKeys<U>
    : T extends object
      ? keyof T | { [K in keyof T]: _DeepKeys<T[K]> }[keyof T]
      : never;

type _ForbiddenPlotDataKey =
    | "row"
    | "rows"
    | "patient"
    | "patients"
    | "patientId"
    | "subjectId"
    | "subjects"
    | "records"
    | "raw";

type _PrivacyGuardPasses<T> = (_ForbiddenPlotDataKey & _DeepKeys<T>) extends never
    ? true
    : false;

const _privacyGuard: _PrivacyGuardPasses<PlotData> = true;
void _privacyGuard;

// C3 — negative test for the privacy guard. If `_DeepKeys` ever stops recursing into
// readonly arrays, or `_ForbiddenPlotDataKey` is widened to `never`, the guard
// degenerates to `true` for everything and would silently pass. This block constructs
// a known-bad shape and asserts the guard correctly resolves to `false`.
type _BadShape = {
    readonly kind: "km";
    readonly groups: ReadonlyArray<{ readonly rows: ReadonlyArray<{ patientId: string }> }>;
};
type _GuardOnBadShape = _PrivacyGuardPasses<_BadShape>;

// Should be `false` (the guard fired). If a future change makes the guard always
// pass, the `false` assignment below will start matching `true` and TypeScript will
// flag this `@ts-expect-error` as unused — that's the regression signal.
// @ts-expect-error _GuardOnBadShape MUST resolve to `false`; if this comment becomes
// unused, the privacy guard regressed.
const _guardFiresOnBadShape: true = null as unknown as _GuardOnBadShape;
void _guardFiresOnBadShape;
