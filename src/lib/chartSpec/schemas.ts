import { z } from "zod";

const nonEmpty = (): z.ZodString => z.string().min(1);

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

const rocSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("roc"),
        showAuc: z.boolean(),
        showDiagonalRef: z.boolean(),
    })
    .strict();

const forestSpecSchema = z
    .object({
        ...baseSpecShape,
        kind: z.literal("forest"),
        showPooled: z.boolean(),
        showHeterogeneity: z.boolean(),
        nullValue: z.number(),
    })
    .strict();

export const chartSpecSchema = z.discriminatedUnion("kind", [
    kmSpecSchema,
    barErrorSpecSchema,
    rocSpecSchema,
    forestSpecSchema,
]);

const survivalUnit = z.number().min(0).max(1);
const probabilityUnit = z.number().min(0).max(1);

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

const rocPointSchema = z
    .object({
        fpr: probabilityUnit,
        tpr: probabilityUnit,
        threshold: z.number().optional(),
    })
    .strict();

const rocCurveSchema = z
    .object({
        label: nonEmpty(),
        points: z.array(rocPointSchema).readonly(),
        auc: z.number(),
    })
    .strict();

const rocPlotDataSchema = z
    .object({
        kind: z.literal("roc"),
        curves: z.array(rocCurveSchema).readonly(),
    })
    .strict();

const forestRowSchema = z
    .object({
        label: nonEmpty(),
        estimate: z.number(),
        ciLow: z.number(),
        ciHigh: z.number(),
        n: z.number(),
    })
    .strict()
    .refine(
        (row) => row.ciLow <= row.estimate && row.estimate <= row.ciHigh,
        { path: ["ciLow"], message: "ciLow <= estimate <= ciHigh required" },
    );

const forestPooledSchema = z
    .object({
        estimate: z.number(),
        ciLow: z.number(),
        ciHigh: z.number(),
    })
    .strict();

const forestPlotDataSchema = z
    .object({
        kind: z.literal("forest"),
        subgroups: z.array(forestRowSchema).readonly(),
        pooled: forestPooledSchema.optional(),
    })
    .strict();

export const plotDataSchema = z.discriminatedUnion("kind", [
    kmPlotDataSchema,
    barErrorPlotDataSchema,
    rocPlotDataSchema,
    forestPlotDataSchema,
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
        recommendation: recommendationBlockSchema,
        alternatives: z.array(alternativeBlockSchema).readonly(),
        transformations: z.array(transformationBlockSchema).readonly(),
        testsTitle: nonEmpty(),
        tests: z.array(statTestSchema).readonly(),
    })
    .strict();
