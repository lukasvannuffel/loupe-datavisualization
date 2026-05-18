"use client";

import type { RecommendPayload } from "@/lib/ai/recommendChart.types";
import { receiptSchema } from "@/lib/chartSpec/schemas";

import { canonicalize } from "./canonicalize";
import { sha256 } from "./hash";
import type { CacheEntry, CacheLookup, ContentHash } from "./cache.types";
import { chartKindPersistedSchema, sanitizePersistedEntries } from "./validatePersistedEntry";

const STORAGE_KEY = "loupe.recommendCache";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;

type CacheFile = { readonly version: 1; readonly entries: ReadonlyArray<unknown> };

const readStore = (): CacheFile => {
    if (typeof window === "undefined") {
        return { entries: [], version: 1 };
    }
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { entries: [], version: 1 };
        }
        const parsed = JSON.parse(raw) as { entries?: unknown; version?: unknown };
        if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
            throw new Error("bad");
        }
        return { entries: parsed.entries, version: 1 };
    } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return { entries: [], version: 1 };
    }
};

const writeStore = (file: { readonly version: 1; readonly entries: ReadonlyArray<CacheEntry> }): void => {
    if (typeof window === "undefined") {
        return;
    }
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    } catch {
        // `QuotaExceededError` is swallowed intentionally: when sessionStorage is full the cache
        // silently degrades to a miss rather than crashing the AI recommendation flow. happy-dom
        // does not enforce storage quotas, so this branch is not exercised by unit tests —
        // Playwright's smoke suite injects a storage-full condition to verify graceful degradation
        // end-to-end.
    }
};

const trimOldest = (entries: ReadonlyArray<CacheEntry>): ReadonlyArray<CacheEntry> =>
    entries.length <= MAX_ENTRIES
        ? entries
        : [...entries]
              .sort((a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime())
              .slice(-MAX_ENTRIES);

export const hashPayload = async (payload: RecommendPayload): Promise<ContentHash> =>
    sha256(canonicalize(payload));

export const getCacheEntry = async (payload: RecommendPayload): Promise<CacheLookup> => {
    const hash = await hashPayload(payload);
    const file = readStore();
    const sanitized = sanitizePersistedEntries(file.entries);
    if (sanitized.length !== file.entries.length) {
        writeStore({ entries: sanitized, version: 1 });
    }
    const now = Date.now();
    const fresh = sanitized.filter((e) => now - new Date(e.cachedAt).getTime() < TTL_MS);
    if (fresh.length !== sanitized.length) {
        writeStore({ entries: fresh, version: 1 });
    }
    const hit = fresh.find((e) => e.hash === hash);
    return hit !== undefined ? { entry: hit, ok: true } : { ok: false };
};

export const setCacheEntry = async (
    payload: RecommendPayload,
    receipt: CacheEntry["receipt"],
    chartKind: CacheEntry["chartKind"],
    costEstimateEur: number,
): Promise<void> => {
    const checked = receiptSchema.safeParse(receipt);
    if (!checked.success) {
        return;
    }
    if (!chartKindPersistedSchema.safeParse(chartKind).success) {
        return;
    }
    const hash = await hashPayload(payload);
    const file = readStore();
    const prior = sanitizePersistedEntries(file.entries);
    const entry: CacheEntry = {
        cachedAt: new Date().toISOString(),
        chartKind,
        costEstimateEur,
        hash,
        receipt: checked.data,
    };
    const merged: ReadonlyArray<CacheEntry> = [entry, ...prior.filter((e) => e.hash !== hash)];
    writeStore({ entries: trimOldest(merged), version: 1 });
};

export const clearCache = (): void => {
    if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(STORAGE_KEY);
    }
};
