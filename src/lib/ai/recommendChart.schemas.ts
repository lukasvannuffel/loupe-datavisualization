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

export const aiResponseSchema = z
    .object({
        chartType: z.enum(MVP_CHART_KINDS),
        confidence: z.number().min(0).max(1),
        recommendation: z
            .object({
                chartName: z.string().min(1).max(80),
                headline: z.string().min(1).max(200),
                becauseTitle: z.string().min(1).max(80),
                because: z.string().min(1).max(600),
                handlesTitle: z.string().min(1).max(80),
                handles: z.string().min(1).max(400),
            })
            .strict(),
        alternatives: z
            .array(
                z
                    .object({
                        slug: z.enum(MVP_CHART_KINDS),
                        name: z.string().min(1).max(80),
                        reason: z.string().min(1).max(300),
                    })
                    .strict(),
            )
            .max(2),
        transformations: z
            .array(
                z
                    .object({
                        verb: z.string().min(1).max(40),
                        chart: z.string().min(1).max(80),
                    })
                    .strict(),
            )
            .max(5),
        testsTitle: z.string().min(1).max(80),
        tests: z
            .array(
                z
                    .object({
                        label: z.string().min(1).max(120),
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
