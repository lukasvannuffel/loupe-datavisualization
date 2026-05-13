import { receiptSchema } from "@/lib/chartSpec/schemas";
import { z } from "zod";

import type { CacheEntry } from "./cache.types";
import { toContentHash } from "./hash";

export const chartKindPersistedSchema = z.enum(["km", "barError", "box", "xy"]);

const hex64 = z.string().regex(/^[0-9a-f]{64}$/);

const persistedCacheEntrySchema = z
    .object({
        cachedAt: z.string(),
        chartKind: chartKindPersistedSchema,
        costEstimateEur: z.number(),
        hash: hex64,
        receipt: receiptSchema,
    })
    .strict();

/**
 * Parses one stored JSON object. Returns null if shape violates Zod (unknown keys on
 * `receipt`, forbidden row-level fields, wrong chart kind, bad hash hex, etc.).
 */
export const parsePersistedCacheEntry = (raw: unknown): CacheEntry | null => {
    const parsed = persistedCacheEntrySchema.safeParse(raw);
    if (!parsed.success) {
        return null;
    }

    const d = parsed.data;

    return {
        cachedAt: d.cachedAt,
        chartKind: d.chartKind,
        costEstimateEur: d.costEstimateEur,
        hash: toContentHash(d.hash),
        receipt: d.receipt,
    };
};

export const sanitizePersistedEntries = (raw: ReadonlyArray<unknown>): ReadonlyArray<CacheEntry> => {
    const out: CacheEntry[] = [];

    for (const item of raw) {
        const entry = parsePersistedCacheEntry(item);
        if (entry !== null) {
            out.push(entry);
        }
    }

    return out;
};
