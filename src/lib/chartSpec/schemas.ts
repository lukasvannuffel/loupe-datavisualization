import { z } from "zod";

import { MANUAL_SELECTION_NOTE } from "./types";

const nonEmpty = (): z.ZodString => z.string().min(1);

const selectionModeSchema = z.enum(["ai", "manual"]);

const chartSlugSchema = z.enum([
    "km",
    "forest",
    "box",
    "roc",
    "volcano",
    "bland",
    "violin",
    "funnel",
    "spaghetti",
    "barError",
    "dot",
    "groupedBar",
    "bar",
    "barHorizontal",
    "stackedBar",
    "stackedBar100",
    "line",
    "scatter",
    "xy",
    "histogram",
    "pie",
    "donut",
    "lollipop",
    "pairedPlot",
    "sankey",
    "sunburst",
]);

const statAnnotationSchema = z.discriminatedUnion("kind", [
    z
        .object({
            kind: z.literal("bracket"),
            from: z.number(),
            to: z.number(),
            label: z.enum(["*", "**", "***", "ns"]),
            pValue: z.number().optional(),
            level: z.number(),
        })
        .strict(),
    z
        .object({
            kind: z.literal("pLabel"),
            target: z.number(),
            pValue: z.number(),
        })
        .strict(),
]);

const baseSpecShape = {
    version: z.literal(1),
    id: nonEmpty(),
    createdAt: z.iso.datetime(),
    title: nonEmpty(),
    caption: nonEmpty().optional(),
    xLabel: nonEmpty().optional(),
    yLabel: nonEmpty().optional(),
    showLegend: z.boolean(),
    showGrid: z.boolean(),
    paletteId: nonEmpty(),
    strokeWeight: z.number().positive(),
};

const kmSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("km"),
        legendA: nonEmpty(),
        legendB: nonEmpty().optional(),
        dashB: z.boolean(),
        showAtRisk: z.boolean(),
        showStats: z.boolean(),
        timeUnit: z.enum(["days", "weeks", "months", "years"]),
    })
    .strict();

const barErrorSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("barError"),
        errorBarType: z.enum(["sd", "sem", "ci95"]),
        annotations: z.array(statAnnotationSchema).readonly(),
    })
    .strict();

const boxSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("box"),
        showOutliers: z.boolean(),
        showMeanMarker: z.boolean(),
        notched: z.boolean(),
    })
    .strict();

const xySpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("xy"),
        mode: z.enum(["line", "scatter", "both"]),
        showRegression: z.boolean(),
        showErrorBands: z.boolean(),
    })
    .strict();

export const chartSpecSchema = z.discriminatedUnion("kind", [
    kmSpecSchema,
    barErrorSpecSchema,
    boxSpecSchema,
    xySpecSchema,
]);

const survivalUnit = z.number().min(0).max(1);

const kmPointSchema = z
    .object({
        time: z.number(),
        survival: survivalUnit,
        atRisk: z.number(),
        censored: z.number(),
    })
    .strict();

const kmCiSchema = z
    .object({
        time: z.number(),
        lower: z.number(),
        upper: z.number(),
    })
    .strict();

const kmGroupSchema = z
    .object({
        label: nonEmpty(),
        points: z.array(kmPointSchema).readonly(),
        median: z.number().optional(),
        ci: z.array(kmCiSchema).readonly().optional(),
    })
    .strict();

const kmPlotDataSchema = z
    .object({
        kind: z.literal("km"),
        groups: z.array(kmGroupSchema).readonly(),
    })
    .strict();

const barErrorCategorySchema = z
    .object({
        label: nonEmpty(),
        mean: z.number(),
        error: z.number(),
        n: z.number(),
    })
    .strict();

const barErrorPlotDataSchema = z
    .object({
        kind: z.literal("barError"),
        categories: z.array(barErrorCategorySchema).readonly(),
    })
    .strict();

const boxGroupSchema = z
    .object({
        label: nonEmpty(),
        min: z.number(),
        q1: z.number(),
        median: z.number(),
        q3: z.number(),
        max: z.number(),
        outliers: z.array(z.number()).readonly(),
        n: z.number(),
    })
    .strict();

const boxPlotDataSchema = z
    .object({
        kind: z.literal("box"),
        groups: z.array(boxGroupSchema).readonly(),
    })
    .strict();

const xyPointSchema = z
    .object({
        x: z.number(),
        y: z.number(),
        errorLow: z.number().optional(),
        errorHigh: z.number().optional(),
    })
    .strict();

const xyRegressionSchema = z
    .object({
        slope: z.number(),
        intercept: z.number(),
        r2: z.number(),
    })
    .strict();

const xySeriesSchema = z
    .object({
        label: nonEmpty(),
        points: z.array(xyPointSchema).readonly(),
        regression: xyRegressionSchema.optional(),
    })
    .strict();

const xyPlotDataSchema = z
    .object({
        kind: z.literal("xy"),
        series: z.array(xySeriesSchema).readonly(),
    })
    .strict();

export const plotDataSchema = z.discriminatedUnion("kind", [
    kmPlotDataSchema,
    barErrorPlotDataSchema,
    boxPlotDataSchema,
    xyPlotDataSchema,
]);

const recommendationBlockSchema = z
    .object({
        chartName: nonEmpty(),
        headline: nonEmpty(),
        becauseTitle: nonEmpty(),
        because: nonEmpty(),
        handlesTitle: nonEmpty(),
        handles: nonEmpty(),
    })
    .strict();

const alternativeBlockSchema = z
    .object({
        slug: chartSlugSchema,
        name: nonEmpty(),
        reason: nonEmpty(),
    })
    .strict();

const transformationBlockSchema = z
    .object({
        verb: nonEmpty(),
        chart: nonEmpty(),
    })
    .strict();

const statTestSchema = z
    .object({
        label: nonEmpty(),
        name: nonEmpty().optional(),
        pValue: z.number().optional(),
        statistic: z.number().optional(),
        ci95: z.tuple([z.number(), z.number()]).readonly().optional(),
        notes: nonEmpty().optional(),
    })
    .strict();

export const receiptSchema = z
    .object({
        intent: nonEmpty(),
        selectionMode: selectionModeSchema,
        manualSelectionNote: z.literal(MANUAL_SELECTION_NOTE).optional(),
        recommendation: recommendationBlockSchema,
        alternatives: z.array(alternativeBlockSchema).readonly(),
        transformations: z.array(transformationBlockSchema).readonly(),
        testsTitle: nonEmpty(),
        tests: z.array(statTestSchema).readonly(),
    })
    .strict()
    .refine(
        (r) =>
            r.selectionMode === "manual"
                ? r.manualSelectionNote === MANUAL_SELECTION_NOTE
                : r.manualSelectionNote === undefined,
        {
            path: ["manualSelectionNote"],
            message:
                "manualSelectionNote must equal the canonical note iff selectionMode === 'manual'",
        },
    );
