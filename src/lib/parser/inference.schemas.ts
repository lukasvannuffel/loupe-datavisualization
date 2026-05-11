import { z } from "zod";

import type { ColumnInference } from "./inference.types";

const primaryTypeSchema = z.enum([
    "numeric",
    "integer",
    "categorical",
    "binary",
    "date",
    "datetime",
]);

const semanticTagSchema = z.enum(["time-to-event", "event-status", "patient-id"]);

/**
 * Strict shape contract for a persisted `ColumnInference`. Mirrors `inference.types.ts`
 * exactly. `sampleValues` is capped at 5 to preserve the privacy invariant — anything
 * fatter is rejected at the storage boundary.
 */
export const columnInferenceSchema: z.ZodType<ColumnInference> = z
    .object({
        name: z.string().min(1),
        primaryType: primaryTypeSchema,
        semanticTag: semanticTagSchema.optional(),
        confidence: z.number(),
        reasons: z.array(z.string()).readonly(),
        nullCount: z.number().int().nonnegative(),
        uniqueCount: z.number().int().nonnegative(),
        sampleValues: z.array(z.string()).max(5).readonly(),
    })
    .strict();

export const columnInferenceArraySchema: z.ZodType<readonly ColumnInference[]> = z
    .array(columnInferenceSchema)
    .readonly();
