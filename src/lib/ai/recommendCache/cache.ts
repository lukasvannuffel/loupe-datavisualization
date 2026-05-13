"use client";
import type { RecommendPayload } from "@/lib/ai/recommendChart.types";

import { canonicalize } from "./canonicalize";
import { sha256 } from "./hash";
import type { CacheEntry, CacheLookup, ContentHash } from "./cache.types";

const STORAGE_KEY = "loupe.recommendCache";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;

type CacheFile = { readonly version: 1; readonly entries: ReadonlyArray<CacheEntry> };

const readStore = (): CacheFile => {
    if (typeof window === "undefined") {
        return { entries: [], version: 1 };
    }
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { entries: [], version: 1 };
        }
        const parsed = JSON.parse(raw) as CacheFile;
        if (parsed.version !== 1 || !Array.isArray(parsed.entries)) {
            throw new Error("bad");
        }
        return parsed;
    } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return { entries: [], version: 1 };
    }
};

const writeStore = (file: CacheFile): void => {
    if (typeof window === "undefined") {
        return;
    }
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    } catch {
        /* quota */
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
    const now = Date.now();
    const fresh = file.entries.filter((e) => now - new Date(e.cachedAt).getTime() < TTL_MS);
    if (fresh.length !== file.entries.length) {
        writeStore({ entries: fresh, version: 1 });
    }
    const hit = fresh.find((e) => e.hash === hash);
    return hit !== undefined ? { ok: true, entry: hit } : { ok: false };
};

export const setCacheEntry = async (
    payload: RecommendPayload,
    receipt: CacheEntry["receipt"],
    chartKind: CacheEntry["chartKind"],
    costEstimateEur: number,
): Promise<void> => {
    const hash = await hashPayload(payload);
    const file = readStore();
    const entry: CacheEntry = {
        cachedAt: new Date().toISOString(),
        chartKind,
        costEstimateEur,
        hash,
        receipt,
    };
    const merged: ReadonlyArray<CacheEntry> = [entry, ...file.entries.filter((e) => e.hash !== hash)];
    writeStore({ entries: trimOldest(merged), version: 1 });
};

export const clearCache = (): void => {
    if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(STORAGE_KEY);
    }
};
