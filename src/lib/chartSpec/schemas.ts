import { z } from "zod";

import { MANUAL_SELECTION_NOTE } from "./types";

const nonEmpty = (): z.ZodString => z.string().min(1);

const selectionModeSchema = z.enum(["ai", "manual"]);

export const chartSlugSchema = z.enum([
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

const axisCustomizationSchema = z
    .object({
        label: nonEmpty().optional(),
    })
    .strict();

const paletteNameSchema = z.enum([
    "editorial",
    "okabe-ito",
    "wong",
    "ibm-design",
    "tol-vibrant",
    "deuteranopia-tuned",
    "monochrome",
]);

const customizationsSchema = z
    .object({
        title: nonEmpty().optional(),
        axes: z
            .object({
                x: axisCustomizationSchema.optional(),
                y: axisCustomizationSchema.optional(),
            })
            .strict()
            .optional(),
        palette: paletteNameSchema.optional(),
    })
    .strict();

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
        customizations: customizationsSchema.optional(),
    })
    .strict();

const barErrorSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("barError"),
        errorBarType: z.enum(["sd", "sem", "ci95"]),
        annotations: z.array(statAnnotationSchema).readonly(),
        customizations: customizationsSchema.optional(),
    })
    .strict();

const boxSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("box"),
        showOutliers: z.boolean(),
        showMeanMarker: z.boolean(),
        notched: z.boolean(),
        customizations: customizationsSchema.optional(),
    })
    .strict();

const xySpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("xy"),
        mode: z.enum(["line", "scatter", "both"]),
        showRegression: z.boolean(),
        showErrorBands: z.boolean(),
        customizations: customizationsSchema.optional(),
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
        t: z.number(),
        survival: survivalUnit,
        nAtRisk: z.number(),
        censored: z.boolean(),
        ciLower: z.number(),
        ciUpper: z.number(),
    })
    .strict();

const atRiskTickSchema = z
    .object({
        t: z.number(),
        nAtRisk: z.number(),
    })
    .strict();

const kmGroupSchema = z
    .object({
        label: nonEmpty(),
        points: z.array(kmPointSchema).readonly(),
        atRiskTicks: z.array(atRiskTickSchema).readonly(),
        nTotal: z.number(),
        nEvents: z.number(),
    })
    .strict();

const kmPlotDataSchema = z
    .object({
        kind: z.literal("km"),
        groups: z.array(kmGroupSchema).readonly(),
        tMax: z.number(),
    })
    .strict();

const barErrorGroupStatsSchema = z
    .object({
        label: nonEmpty(),
        mean: z.number(),
        sd: z.number(),
        n: z.number(),
    })
    .strict();

const barErrorPlotDataSchema = z
    .object({
        kind: z.literal("barError"),
        groups: z.array(barErrorGroupStatsSchema).readonly(),
    })
    .strict();

const boxStatsSchema = z
    .object({
        kind: z.literal("box"),
        label: nonEmpty(),
        n: z.number(),
        min: z.number(),
        q1: z.number(),
        median: z.number(),
        q3: z.number(),
        max: z.number(),
        mean: z.number(),
        outliers: z.array(z.number()).readonly(),
        notchLower: z.number(),
        notchUpper: z.number(),
    })
    .strict();

const stripStatsSchema = z
    .object({
        kind: z.literal("strip"),
        label: nonEmpty(),
        n: z.number(),
        values: z.array(z.number()).readonly(),
    })
    .strict();

const groupStatsSchema = z.discriminatedUnion("kind", [boxStatsSchema, stripStatsSchema]);

const boxPlotDataSchema = z
    .object({
        kind: z.literal("box"),
        groups: z.array(groupStatsSchema).readonly(),
        yMin: z.number(),
        yMax: z.number(),
    })
    .strict()
    .superRefine((data, ctx) => {
        data.groups.forEach((g, i) => {
            if (g.kind !== "box") {
                return;
            }

            const ordered =
                g.min <= g.q1 &&
                g.q1 <= g.median &&
                g.median <= g.q3 &&
                g.q3 <= g.max;

            if (!ordered) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "min, quartiles, and max must satisfy min ≤ q1 ≤ median ≤ q3 ≤ max",
                    path: ["groups", i],
                });
            }
        });
    });

const xyPointSchema = z
    .object({
        x: z.number(),
        y: z.number(),
    })
    .strict();

const xyRegressionSchema = z
    .object({
        slope: z.number(),
        intercept: z.number(),
        r2: z.number(),
    })
    .strict();

const labeledRegressionSchema = xyRegressionSchema.extend({
    label: nonEmpty(),
});

const xyGroupSchema = z
    .object({
        label: nonEmpty(),
        points: z.array(xyPointSchema).readonly(),
    })
    .strict();

const xyPlotDataSchema = z
    .object({
        kind: z.literal("xy"),
        groups: z.array(xyGroupSchema).readonly(),
        regressions: z.array(labeledRegressionSchema).readonly(),
        regressionSkipped: z.boolean(),
        xMin: z.number(),
        xMax: z.number(),
        yMin: z.number(),
        yMax: z.number(),
    })
    .strict()
    .superRefine((data, ctx) => {
        data.groups.forEach((g, i) => {
            if (g.points.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "each group must have at least one point",
                    path: ["groups", i, "points"],
                });
            }
        });
    });

const longitudinalPointSchema = z
    .object({
        visit: z.number(),
        mean: z.number(),
        sem: z.number(),
        n: z.number(),
    })
    .strict();

const longitudinalGroupSchema = z
    .object({
        label: nonEmpty(),
        points: z.array(longitudinalPointSchema).readonly(),
    })
    .strict();

const longitudinalPlotDataSchema = z
    .object({
        kind: z.literal("longitudinal"),
        groups: z.array(longitudinalGroupSchema).readonly(),
        xMin: z.number(),
        xMax: z.number(),
        yMin: z.number(),
        yMax: z.number(),
    })
    .strict();

export const plotDataSchema = z.discriminatedUnion("kind", [
    kmPlotDataSchema,
    barErrorPlotDataSchema,
    boxPlotDataSchema,
    xyPlotDataSchema,
    longitudinalPlotDataSchema,
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
        pValue: z.number().min(0).max(1).optional(),
        statistic: z.number().optional(),
        ci95: z.tuple([z.number(), z.number()]).readonly().optional(),
        notes: nonEmpty().optional(),
    })
    .strict();

const specKindSchema = z.enum(["km", "barError", "box", "xy"]);

const overrideEventSchema = z
    .object({
        from: specKindSchema,
        to: specKindSchema,
        at: z.iso.datetime(),
        reason: nonEmpty().optional(),
    })
    .strict();

const receiptObjectSchema = z
    .object({
        intent: nonEmpty(),
        selectionMode: selectionModeSchema,
        manualSelectionNote: z.literal(MANUAL_SELECTION_NOTE).optional(),
        recommendation: recommendationBlockSchema,
        alternatives: z.array(alternativeBlockSchema).readonly(),
        transformations: z.array(transformationBlockSchema).readonly(),
        testsTitle: nonEmpty(),
        tests: z.array(statTestSchema).readonly(),
        overrides: z.array(overrideEventSchema).readonly(),
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

export const receiptSchema = z.preprocess((val) => {
    if (val !== null && typeof val === "object" && !Array.isArray(val) && !("overrides" in val)) {
        return { ...val, overrides: [] };
    }

    return val;
}, receiptObjectSchema);
