import { z } from "zod";

import type { ChartSpec } from "@/lib/chartSpec/types";
import type { ColumnRole } from "@/lib/roles/types";

/** MVP chart kinds (`SpecKind`). Mirrors providers `chartKindSchema`. Kept aligned via `_AssertEnumMatches` below. Centralize when LOUPE-26 expands the MVP union. */
export const MVP_CHART_KINDS = ["km", "barError", "box", "xy"] as const;

/** Must match the privacy-oriented superRefine message — used by recommendChart for PRIVACY_VIOLATION classification. */
export const FORBIDDEN_PAYLOAD_REFINE_MESSAGE = "Payload contains forbidden keys." as const;

const FORBIDDEN_KEYS = new Set([
    "rows",
    "data",
    "values",
    "sample",
    "sampleValues",
    "cells",
    "raw",
]);

export const containsForbiddenKeyDeep = (value: unknown): boolean => {
    if (value === null || typeof value !== "object") {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some((item) => containsForbiddenKeyDeep(item));
    }

    const record = value as Record<string, unknown>;

    for (const key of Object.keys(record)) {
        if (FORBIDDEN_KEYS.has(key)) {
            return true;
        }

        if (containsForbiddenKeyDeep(record[key])) {
            return true;
        }
    }

    return false;
};

const primaryTypeSchema = z.enum([
    "numeric",
    "integer",
    "categorical",
    "binary",
    "date",
    "datetime",
]);

const semanticTagSchema = z.enum(["time-to-event", "event-status", "patient-id"]);

const aiColumnSchema = z
    .object({
        name: z.string().min(1),
        primaryType: primaryTypeSchema,
        semanticTag: semanticTagSchema.optional(),
        nullCount: z.number().int().min(0),
        uniqueCount: z.number().int().min(0),
    })
    .strict();

const mappingSchema = z
    .object({
        time: z.string().optional(),
        event: z.string().optional(),
        group: z.string().optional(),
        outcome: z.string().optional(),
        predictor: z.string().optional(),
        x: z.string().optional(),
        y: z.string().optional(),
        id: z.string().optional(),
        ignore: z.string().optional(),
    })
    .strict();

export const payloadSchema = z
    .object({
        columns: z.array(aiColumnSchema),
        mapping: mappingSchema,
        intent: z.string().min(1),
    })
    .strict()
    // .strict() at every nested layer is the primary defense — it rejects unknown keys before this walker runs.
    // This .superRefine remains as belt-and-braces if future schemas relax strictness; the walker is unit-tested in recommendChart.schemas.test.ts.
    .superRefine((data, ctx) => {
        if (containsForbiddenKeyDeep(data)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: FORBIDDEN_PAYLOAD_REFINE_MESSAGE,
                path: [],
            });
        }
    })
    .superRefine((data, ctx) => {
        const names = new Set(data.columns.map((c) => c.name));

        for (const role of Object.keys(data.mapping) as ColumnRole[]) {
            const col = data.mapping[role];

            if (col !== undefined && !names.has(col)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Mapping references a column not listed in columns.",
                    path: ["mapping", role],
                });
            }
        }
    });

/** Max characters per AI response string, keyed by the field path the model sees. The gateway does not enforce `maxLength`, so the system prompt states these explicitly. */
export const AI_RESPONSE_MAX_LENGTH = {
    "recommendation.chartName": 80,
    "recommendation.headline": 200,
    "recommendation.becauseTitle": 80,
    "recommendation.because": 600,
    "recommendation.handlesTitle": 80,
    "recommendation.handles": 400,
    "alternatives[].name": 80,
    "alternatives[].reason": 300,
    "transformations[].verb": 40,
    "transformations[].chart": 80,
    testsTitle: 80,
    "tests[].label": 120,
} as const;

const boundedText = (field: keyof typeof AI_RESPONSE_MAX_LENGTH): z.ZodString =>
    z.string().min(1).max(AI_RESPONSE_MAX_LENGTH[field]);

export const aiResponseSchema = z
    .object({
        chartType: z.enum(MVP_CHART_KINDS),
        confidence: z.number().min(0).max(1),
        recommendation: z
            .object({
                chartName: boundedText("recommendation.chartName"),
                headline: boundedText("recommendation.headline"),
                becauseTitle: boundedText("recommendation.becauseTitle"),
                because: boundedText("recommendation.because"),
                handlesTitle: boundedText("recommendation.handlesTitle"),
                handles: boundedText("recommendation.handles"),
            })
            .strict(),
        alternatives: z
            .array(
                z
                    .object({
                        slug: z.enum(MVP_CHART_KINDS),
                        name: boundedText("alternatives[].name"),
                        reason: boundedText("alternatives[].reason"),
                    })
                    .strict(),
            )
            .max(2),
        transformations: z
            .array(
                z
                    .object({
                        verb: boundedText("transformations[].verb"),
                        chart: boundedText("transformations[].chart"),
                    })
                    .strict(),
            )
            .max(5),
        testsTitle: boundedText("testsTitle"),
        tests: z
            .array(
                z
                    .object({
                        label: boundedText("tests[].label"),
                        name: z.string().optional(),
                        pValue: z.number().min(0).max(1).optional(),
                        statistic: z.number().optional(),
                        ci95: z.tuple([z.number(), z.number()]).optional(),
                        notes: z.string().optional(),
                    })
                    .strict(),
            )
            .max(3),
    })
    .strict();

type _AssertEnumMatches = z.infer<typeof aiResponseSchema>["chartType"] extends ChartSpec["kind"]
    ? ChartSpec["kind"] extends z.infer<typeof aiResponseSchema>["chartType"]
        ? z.infer<typeof aiResponseSchema>["alternatives"][number]["slug"] extends ChartSpec["kind"]
            ? ChartSpec["kind"] extends z.infer<typeof aiResponseSchema>["alternatives"][number]["slug"]
                ? true
                : never
            : never
        : never
    : never;

const _check: _AssertEnumMatches = true;

void _check;
