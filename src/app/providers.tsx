"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import type { ChartSlug } from "@/components/charts/chartPreviews";
import { clearCache } from "@/lib/ai/recommendCache/cache";
import type { ChartSpec } from "@/lib/chartSpec";
import { chartSpecSchema, receiptSchema } from "@/lib/chartSpec/schemas";
import type { OverrideEvent, Receipt } from "@/lib/chartSpec/types";
import { columnInferenceArraySchema } from "@/lib/parser/inference.schemas";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows, type PrivateRows } from "@/lib/parser/types";
import type { ColumnRole, Mapping } from "@/lib/roles/types";
import { z } from "zod";

const INTENT_KEY = "loupe.intent";
const DATASET_KEY = "loupe.dataset";
const DATASET_ROWS_KEY = "loupe.datasetRows";
const DATASET_SOURCE_KEY = "loupe.datasetSource";
const MAPPING_KEY = "loupe.mapping";
const SELECTION_MODE_KEY = "loupe.selectionMode";
const RECEIPT_KEY = "loupe.receipt";
const CHART_KIND_KEY = "loupe.chartKind";

// Mirrors specKindSchema. Kept aligned via _AssertEnumMatches in recommendChart.schemas.ts. Centralize when LOUPE-26 expands the MVP union.
const chartKindSchema = z.enum(["km", "barError", "box", "xy"]);

export type SelectionMode = "ai" | "manual";

export type { ColumnRole, Mapping };

export type DatasetSource = {
    readonly fileName: string;
    readonly rowCount: number;
    readonly sheetName?: string;
};

export type LoupeDataset = {
    readonly inferences: readonly ColumnInference[];
    readonly rows: PrivateRows;
};

type AppState = {
    readonly hydrated: boolean;
    readonly intent: string;
    readonly setIntent: (next: string) => void;
    readonly mapping: Mapping;
    readonly setMapping: (next: Mapping) => void;
    readonly dataset: LoupeDataset | null;
    readonly setDataset: (
        inferences: readonly ColumnInference[],
        rows: PrivateRows,
        source?: DatasetSource,
    ) => void;
    readonly clearDataset: () => void;
    readonly clearRecommendCache: () => void;
    readonly lastRecommendationFromCache: boolean;
    readonly setLastRecommendationFromCache: (next: boolean) => void;
    readonly receipt: Receipt | null;
    readonly setReceipt: (next: Receipt | null) => void;
    readonly appendOverride: (event: OverrideEvent) => void;
    readonly updateLatestOverrideReason: (reason: string) => void;
    readonly chartKind: ChartSpec["kind"] | null;
    readonly setChartKind: (next: ChartSpec["kind"] | null) => void;
    readonly chartSlug: ChartSlug | null;
    readonly setChartSlug: (next: ChartSlug | null) => void;
    readonly chartSpec: ChartSpec | null;
    readonly setChartSpec: (next: ChartSpec | null) => void;
    readonly selectionMode: SelectionMode | null;
    readonly setSelectionMode: (next: SelectionMode | null) => void;
};

const AppStateContext = createContext<AppState | null>(null);

const safeParse = <T,>(raw: string | null, guard: (v: unknown) => v is T): T | null => {
    if (raw === null) {
        return null;
    }
    try {
        const value: unknown = JSON.parse(raw);

        return guard(value) ? value : null;
    } catch {
        return null;
    }
};

/**
 * Schema-gated hydration: any persisted dataset that does not match the strict
 * ColumnInference contract is dropped (key removed) so we never render broken UI
 * over malformed state. Silent by design — no console noise for tampered storage.
 */
const isPrivateRowRecord = (v: unknown): v is Readonly<Record<string, string>> =>
    v !== null && typeof v === "object" && !Array.isArray(v);

const hydratePrivateRows = (store: Storage, key: string): PrivateRows | null => {
    const raw = store.getItem(key);
    if (raw === null) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isPrivateRowRecord)) {
            throw new Error("invalid rows");
        }

        return brandRows(parsed);
    } catch {
        store.removeItem(key);

        return null;
    }
};

const hydrateLoupeDataset = (store: Storage): LoupeDataset | null => {
    const raw = store.getItem(DATASET_KEY);
    if (raw === null) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        const result = columnInferenceArraySchema.safeParse(parsed);
        if (!result.success) {
            throw new Error("invalid inferences");
        }
        const rows = hydratePrivateRows(store, DATASET_ROWS_KEY);
        if (rows === null) {
            store.removeItem(DATASET_KEY);

            return null;
        }

        return { inferences: result.data, rows };
    } catch {
        store.removeItem(DATASET_KEY);
        store.removeItem(DATASET_ROWS_KEY);

        return null;
    }
};

const hydrateReceipt = (store: Storage, key: string): Receipt | null => {
    const raw = store.getItem(key);
    if (raw === null) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        const result = receiptSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        /* drop */
    }
    store.removeItem(key);

    return null;
};

const hydrateChartKind = (store: Storage, key: string): ChartSpec["kind"] | null => {
    const raw = store.getItem(key);
    if (raw === null) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        const result = chartKindSchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        /* drop */
    }
    store.removeItem(key);

    return null;
};

const isMapping = (v: unknown): v is Mapping =>
    v !== null && typeof v === "object" && !Array.isArray(v);

const isSelectionMode = (v: unknown): v is SelectionMode => v === "ai" || v === "manual";

const isDatasetSource = (v: unknown): v is DatasetSource => {
    if (v === null || typeof v !== "object") {
        return false;
    }

    const r = v as Record<string, unknown>;

    return (
        typeof r.fileName === "string" &&
        typeof r.rowCount === "number" &&
        (r.sheetName === undefined || typeof r.sheetName === "string")
    );
};

export const AppStateProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [intent, setIntentState] = useState<string>("");
    const [mapping, setMappingState] = useState<Mapping>({});
    const [dataset, setDatasetState] = useState<LoupeDataset | null>(null);
    const [receipt, setReceiptState] = useState<Receipt | null>(null);
    const [chartKind, setChartKindState] = useState<ChartSpec["kind"] | null>(null);
    const [chartSlug, setChartSlugState] = useState<ChartSlug | null>(null);
    const [chartSpec, setChartSpecState] = useState<ChartSpec | null>(null);
    const [selectionMode, setSelectionModeState] = useState<SelectionMode | null>(null);
    const [lastRecommendationFromCache, setLastRecommendationFromCacheState] = useState<boolean>(false);
    const [hydrated, setHydrated] = useState<boolean>(false);
    const didHydrate = useRef<boolean>(false);

    useEffect(() => {
        if (typeof window === "undefined" || didHydrate.current) {
            return;
        }
        didHydrate.current = true;

        const store = window.sessionStorage;
        const storedIntent = store.getItem(INTENT_KEY);
        if (storedIntent !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIntentState(storedIntent);
        }
        const storedDataset = hydrateLoupeDataset(store);
        if (storedDataset !== null) {
            setDatasetState(storedDataset);
        }
        const storedReceipt = hydrateReceipt(store, RECEIPT_KEY);
        if (storedReceipt !== null) {
            setReceiptState(storedReceipt);
        }
        const storedChartKind = hydrateChartKind(store, CHART_KIND_KEY);
        if (storedChartKind !== null) {
            setChartKindState(storedChartKind);
        }
        const storedMapping = safeParse(store.getItem(MAPPING_KEY), isMapping);
        if (storedMapping !== null) {
            setMappingState(storedMapping);
        }
        const storedSelectionMode = store.getItem(SELECTION_MODE_KEY);
        if (isSelectionMode(storedSelectionMode)) {
            setSelectionModeState(storedSelectionMode);
        }
        setHydrated(true);
    }, []);

    const setReceipt = useCallback((next: Receipt | null): void => {
        setReceiptState(next);
        if (typeof window === "undefined") {
            return;
        }
        if (next === null) {
            window.sessionStorage.removeItem(RECEIPT_KEY);

            return;
        }
        window.sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(next));
    }, []);

    const setChartKind = useCallback((next: ChartSpec["kind"] | null): void => {
        setChartKindState(next);
        if (typeof window === "undefined") {
            return;
        }
        if (next === null) {
            window.sessionStorage.removeItem(CHART_KIND_KEY);

            return;
        }
        window.sessionStorage.setItem(CHART_KIND_KEY, JSON.stringify(next));
    }, []);

    // Only updates the most recent override event — correct for "why did you override this time."
    const updateLatestOverrideReason = useCallback((reason: string): void => {
        setReceiptState((prev) => {
            if (prev === null || prev.overrides.length === 0) {
                return prev;
            }
            const updated = [...prev.overrides];
            const last = updated[updated.length - 1];
            const trimmed = reason.trim();
            if (trimmed.length === 0) {
                const { reason: _dropped, ...withoutReason } = last;
                updated[updated.length - 1] = withoutReason;
            } else {
                updated[updated.length - 1] = { ...last, reason: trimmed.slice(0, 500) };
            }
            const next: Receipt = { ...prev, overrides: updated };
            if (typeof window !== "undefined") {
                window.sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(next));
            }

            return next;
        });
    }, []);

    const setIntent = useCallback((next: string): void => {
        setIntentState(next);
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(INTENT_KEY, next);
        }
    }, []);

    const setMapping = useCallback((next: Mapping): void => {
        setMappingState(next);
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(MAPPING_KEY, JSON.stringify(next));
        }
    }, []);

    const setDataset = useCallback(
        (inferences: readonly ColumnInference[], rows: PrivateRows, source?: DatasetSource): void => {
            const next: LoupeDataset = { inferences, rows };
            setDatasetState(next);
            if (typeof window === "undefined") {
                return;
            }

            window.sessionStorage.setItem(DATASET_KEY, JSON.stringify(inferences));
            try {
                window.sessionStorage.setItem(DATASET_ROWS_KEY, JSON.stringify(rows));
            } catch {
                window.sessionStorage.removeItem(DATASET_ROWS_KEY);
            }

            if (source === undefined) {
                return;
            }

            const prevRaw = window.sessionStorage.getItem(DATASET_SOURCE_KEY);
            let prev: DatasetSource | null = null;

            if (prevRaw !== null) {
                try {
                    const parsed: unknown = JSON.parse(prevRaw);
                    if (isDatasetSource(parsed)) {
                        prev = parsed;
                    }
                } catch {
                    /* ignore */
                }
            }

            const changed =
                prev !== null &&
                (prev.fileName !== source.fileName ||
                    prev.rowCount !== source.rowCount ||
                    (prev.sheetName ?? "") !== (source.sheetName ?? ""));

            if (changed) {
                clearCache();
            }

            window.sessionStorage.setItem(DATASET_SOURCE_KEY, JSON.stringify(source));
        },
        [],
    );

    const clearRecommendCache = useCallback((): void => {
        clearCache();
    }, []);

    const setLastRecommendationFromCache = useCallback((next: boolean): void => {
        setLastRecommendationFromCacheState(next);
    }, []);

    const clearDataset = useCallback((): void => {
        setDatasetState(null);
        setReceiptState(null);
        setChartKindState(null);
        setLastRecommendationFromCacheState(false);
        if (typeof window === "undefined") {
            return;
        }

        window.sessionStorage.removeItem(DATASET_KEY);
        window.sessionStorage.removeItem(DATASET_ROWS_KEY);
        window.sessionStorage.removeItem(DATASET_SOURCE_KEY);
        window.sessionStorage.removeItem(RECEIPT_KEY);
        window.sessionStorage.removeItem(CHART_KIND_KEY);
        clearCache();
    }, []);

    const setChartSlug = useCallback((next: ChartSlug | null): void => {
        setChartSlugState(next);
    }, []);

    const appendOverride = useCallback(
        (event: OverrideEvent): void => {
            setReceiptState((prev) => {
                if (prev === null) {
                    return prev;
                }
                const next: Receipt = { ...prev, overrides: [...prev.overrides, event] };
                if (typeof window !== "undefined") {
                    window.sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(next));
                }
                setChartKind(event.to);
                setChartSlug(event.to);

                return next;
            });
        },
        [setChartKind, setChartSlug],
    );

    const setChartSpec = useCallback((next: ChartSpec | null): void => {
        if (next === null) {
            setChartSpecState(null);

            return;
        }

        const parsed = chartSpecSchema.safeParse(next);
        if (!parsed.success) {
            console.warn("Rejected invalid chart spec update:", parsed.error.format());

            return;
        }

        setChartSpecState(parsed.data);
    }, []);

    /**
     * Switching the selection mode resets `chartSlug` and `chartSpec` only —
     * `mapping` and `intent` are intentionally preserved so a user can round-trip
     * AI ↔ Manual without losing the work they already did in /upload/map. A
     * stale chart from a previous mode would leak across boundaries, so we drop
     * both whenever the mode value actually changes. Idempotent writes (e.g.
     * confirming `manual` while already in manual mode) deliberately do NOT
     * reset, so a freshly-built spec on the manual page survives the side-bar
     * "confirm" click before navigation.
     */
    const setSelectionMode = useCallback((next: SelectionMode | null): void => {
        setSelectionModeState((prev) => {
            if (prev !== next) {
                setChartSlugState(null);
                setChartSpecState(null);
            }

            return next;
        });
        if (typeof window === "undefined") {
            return;
        }
        if (next === null) {
            window.sessionStorage.removeItem(SELECTION_MODE_KEY);

            return;
        }
        window.sessionStorage.setItem(SELECTION_MODE_KEY, next);
    }, []);

    const value = useMemo<AppState>(
        () => ({
            hydrated,
            intent,
            setIntent,
            mapping,
            setMapping,
            dataset,
            setDataset,
            clearDataset,
            clearRecommendCache,
            lastRecommendationFromCache,
            setLastRecommendationFromCache,
            receipt,
            setReceipt,
            appendOverride,
            updateLatestOverrideReason,
            chartKind,
            setChartKind,
            chartSlug,
            setChartSlug,
            chartSpec,
            setChartSpec,
            selectionMode,
            setSelectionMode,
        }),
        [
            hydrated,
            intent,
            setIntent,
            mapping,
            setMapping,
            dataset,
            setDataset,
            clearDataset,
            clearRecommendCache,
            lastRecommendationFromCache,
            setLastRecommendationFromCache,
            receipt,
            setReceipt,
            appendOverride,
            updateLatestOverrideReason,
            chartKind,
            setChartKind,
            chartSlug,
            setChartSlug,
            chartSpec,
            setChartSpec,
            selectionMode,
            setSelectionMode,
        ],
    );

    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppState => {
    const ctx = useContext(AppStateContext);
    if (ctx === null) {
        throw new Error("useAppState must be used within an AppStateProvider");
    }

    return ctx;
};
