import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

export type ContentHash = string & { readonly __brand: "ContentHash" };

export type CacheEntry = {
    readonly hash: ContentHash;
    readonly receipt: Receipt;
    readonly chartKind: ChartSpec["kind"];
    readonly costEstimateEur: number;
    readonly cachedAt: string;
};

export type CacheHit = { readonly ok: true; readonly entry: CacheEntry };
export type CacheMiss = { readonly ok: false };
export type CacheLookup = CacheHit | CacheMiss;
