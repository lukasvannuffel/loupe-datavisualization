import type {
    BarErrorSpec,
    BaseSpec,
    BoxSpec,
    ChartSpec,
    KMSpec,
    SpecKind,
    XYSpec,
} from "./types";

const DEFAULT_PALETTE_ID = "monochrome";
const DEFAULT_STROKE_WEIGHT = 1.5;

const newId = (): string => {
    if (typeof globalThis.crypto?.randomUUID === "function") {
        return globalThis.crypto.randomUUID();
    }

    return `spec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const baseFor = (title: string): Omit<BaseSpec, "id" | "createdAt"> => ({
    version: 1,
    title,
    showLegend: true,
    showGrid: true,
    paletteId: DEFAULT_PALETTE_ID,
    strokeWeight: DEFAULT_STROKE_WEIGHT,
});

const TITLES: Readonly<Record<SpecKind, string>> = {
    km: "Survival by group",
    barError: "Group means with error bars",
    box: "Distribution by group",
    xy: "X–Y relationship",
};

const buildKm = (id: string, createdAt: string): KMSpec => ({
    ...baseFor(TITLES.km),
    id,
    createdAt,
    kind: "km",
    legendA: "Group A",
    dashB: true,
    showAtRisk: true,
    showStats: true,
    timeUnit: "months",
});

const buildBarError = (id: string, createdAt: string): BarErrorSpec => ({
    ...baseFor(TITLES.barError),
    id,
    createdAt,
    kind: "barError",
    errorBarType: "ci95",
    annotations: [],
});

const buildBox = (id: string, createdAt: string): BoxSpec => ({
    ...baseFor(TITLES.box),
    id,
    createdAt,
    kind: "box",
    showOutliers: true,
    showMeanMarker: false,
    notched: false,
});

const buildXy = (id: string, createdAt: string): XYSpec => ({
    ...baseFor(TITLES.xy),
    id,
    createdAt,
    kind: "xy",
    mode: "line",
    showRegression: false,
    showCorrelation: false,
});

const FACTORIES: Readonly<Record<SpecKind, (id: string, createdAt: string) => ChartSpec>> = {
    km: buildKm,
    barError: buildBarError,
    box: buildBox,
    xy: buildXy,
};

/**
 * Build a minimal, schema-valid `ChartSpec` for the given kind. Used when the
 * user picks a chart manually (no AI recommendation) so we still have a fully
 * typed spec to seed the editor / export with sensible defaults.
 *
 * Pure aside from `id` (UUID) and `createdAt` (now ISO) — caller may pin both
 * via the optional second arg for deterministic tests.
 */
export const createDefaultChartSpec = (
    kind: SpecKind,
    seed?: { readonly id?: string; readonly createdAt?: string },
): ChartSpec =>
    FACTORIES[kind](seed?.id ?? newId(), seed?.createdAt ?? new Date().toISOString());

/** Minimal default `BarErrorSpec` for renderer smoke tests and pages without a saved spec. */
export const defaultBarErrorSpec = (): BarErrorSpec => {
    const spec = createDefaultChartSpec("barError");
    if (spec.kind !== "barError") {
        throw new Error("createDefaultChartSpec(barError) returned unexpected kind");
    }

    return spec;
};
