// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecommendPayload } from "@/lib/ai/recommendChart.types";
import type { Receipt } from "@/lib/chartSpec/types";

import { clearCache, getCacheEntry, hashPayload, setCacheEntry } from "../cache";

const STORAGE_KEY = "loupe.recommendCache";

const minimalReceipt = (): Receipt => ({
    alternatives: [],
    intent: "intent",
    recommendation: {
        because: "b",
        becauseTitle: "Because",
        chartName: "KM",
        handles: "h",
        handlesTitle: "Handles",
        headline: "head",
    },
    selectionMode: "ai",
    tests: [],
    testsTitle: "Tests",
    transformations: [],
});

const payload = (intent: string): RecommendPayload => ({
    columns: [],
    intent,
    mapping: { time: "col_t" },
});

describe("recommendCache cache", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        window.sessionStorage.clear();
    });

    it("returns miss on cold cache", async () => {
        await expect(getCacheEntry(payload("a"))).resolves.toEqual({ ok: false });
    });

    it("round-trips a successful write", async () => {
        const p = payload("round");
        const receipt = minimalReceipt();
        await setCacheEntry(p, receipt, "km", 0.02);
        const hit = await getCacheEntry(p);
        expect(hit.ok).toBe(true);
        if (hit.ok) {
            expect(hit.entry.receipt).toEqual(receipt);
            expect(hit.entry.chartKind).toBe("km");
            expect(hit.entry.costEstimateEur).toBe(0.02);
            expect(typeof hit.entry.cachedAt).toBe("string");
        }
    });

    it("hashPayload matches for RecommendPayload with different top-level key order", async () => {
        const a: RecommendPayload = {
            columns: [],
            intent: "same",
            mapping: { event: "e", time: "t" },
        };
        const b: RecommendPayload = {
            intent: "same",
            mapping: { time: "t", event: "e" },
            columns: [],
        };
        expect(await hashPayload(a)).toBe(await hashPayload(b));
    });

    it("hits the same bucket when payload keys differ only in insertion order", async () => {
        const receipt = minimalReceipt();
        const a: RecommendPayload = { columns: [], intent: "x", mapping: { time: "t" } };
        const b: RecommendPayload = { intent: "x", mapping: { time: "t" }, columns: [] };
        await setCacheEntry(a, receipt, "km", 0.01);
        await expect(getCacheEntry(b)).resolves.toMatchObject({ ok: true });
    });

    it("drops expired entries on read and returns miss", async () => {
        const p = payload("ttl");
        const receipt = minimalReceipt();
        const nowSpy = vi.spyOn(Date, "now");
        nowSpy.mockReturnValue(1_000_000);
        await setCacheEntry(p, receipt, "km", 0.01);
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        expect(raw).not.toBeNull();
        const file = JSON.parse(raw as string) as { entries: Array<{ cachedAt: string }> };
        const staleIso = new Date(1).toISOString();
        file.entries[0] = { ...file.entries[0], cachedAt: staleIso };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(file));
        nowSpy.mockReturnValue(1_000_000 + 24 * 60 * 60 * 1000 + 1);
        await expect(getCacheEntry(p)).resolves.toEqual({ ok: false });
        const after = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) as string) as {
            entries: unknown[];
        };
        expect(after.entries.length).toBe(0);
    });

    it("keeps at most 20 entries by evicting oldest cachedAt", async () => {
        vi.useFakeTimers();
        try {
            const start = Date.UTC(2026, 0, 1, 12, 0, 0, 0);
            vi.setSystemTime(start);
            for (let i = 0; i < 25; i += 1) {
                await setCacheEntry(payload(`k${i}`), minimalReceipt(), "km", 0);
                vi.advanceTimersByTime(60_000);
            }
            const file = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) as string) as {
                entries: unknown[];
            };
            expect(file.entries.length).toBe(20);
            await expect(getCacheEntry(payload("k0"))).resolves.toEqual({ ok: false });
            await expect(getCacheEntry(payload("k4"))).resolves.toEqual({ ok: false });
            await expect(getCacheEntry(payload("k5"))).resolves.toMatchObject({ ok: true });
            await expect(getCacheEntry(payload("k24"))).resolves.toMatchObject({ ok: true });
        } finally {
            vi.useRealTimers();
        }
    });

    it("clearCache removes the storage key", async () => {
        await setCacheEntry(payload("z"), minimalReceipt(), "km", 0);
        expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
        clearCache();
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("rejects future cache file versions and clears storage", async () => {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: [], version: 2 }));
        await expect(getCacheEntry(payload("v2"))).resolves.toEqual({ ok: false });
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("does not persist a Receipt that fails receiptSchema (e.g. forbidden rows key)", async () => {
        const malicious = { ...minimalReceipt(), rows: [] } as unknown as Receipt;
        await setCacheEntry(payload("bad-rows"), malicious, "km", 0);
        await expect(getCacheEntry(payload("bad-rows"))).resolves.toEqual({ ok: false });
    });

    it("recovers from bad JSON by clearing the key", async () => {
        window.sessionStorage.setItem(STORAGE_KEY, "not json");
        await expect(getCacheEntry(payload("any"))).resolves.toEqual({ ok: false });
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});
