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
import type { ChartSpec } from "@/lib/chartSpec";
import { receiptSchema } from "@/lib/chartSpec/schemas";
import type { Receipt } from "@/lib/chartSpec/types";
import { columnInferenceArraySchema } from "@/lib/parser/inference.schemas";
import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole, Mapping } from "@/lib/roles/types";
import { z } from "zod";

const INTENT_KEY = "loupe.intent";
const DATASET_KEY = "loupe.dataset";
const MAPPING_KEY = "loupe.mapping";
const SELECTION_MODE_KEY = "loupe.selectionMode";
const RECEIPT_KEY = "loupe.receipt";
const CHART_KIND_KEY = "loupe.chartKind";

const chartKindSchema = z.enum(["km", "barError", "box", "xy"]);

export type SelectionMode = "ai" | "manual";

export type { ColumnRole, Mapping };

type AppState = {
    readonly hydrated: boolean;
    readonly intent: string;
    readonly setIntent: (next: string) => void;
    readonly mapping: Mapping;
    readonly setMapping: (next: Mapping) => void;
    readonly dataset: readonly ColumnInference[] | null;
    readonly setDataset: (next: readonly ColumnInference[]) => void;
    readonly clearDataset: () => void;
    readonly receipt: Receipt | null;
    readonly setReceipt: (next: Receipt | null) => void;
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
const hydrateDataset = (
    store: Storage,
    key: string,
): readonly ColumnInference[] | null => {
    const raw = store.getItem(key);
    if (raw === null) {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        const result = columnInferenceArraySchema.safeParse(parsed);
        if (result.success) {
            return result.data;
        }
    } catch {
        // fall through to drop
    }
    store.removeItem(key);

    return null;
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

export const AppStateProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [intent, setIntentState] = useState<string>("");
    const [mapping, setMappingState] = useState<Mapping>({});
    const [dataset, setDatasetState] = useState<readonly ColumnInference[] | null>(null);
    const [receipt, setReceiptState] = useState<Receipt | null>(null);
    const [chartKind, setChartKindState] = useState<ChartSpec["kind"] | null>(null);
    const [chartSlug, setChartSlugState] = useState<ChartSlug | null>(null);
    const [chartSpec, setChartSpecState] = useState<ChartSpec | null>(null);
    const [selectionMode, setSelectionModeState] = useState<SelectionMode | null>(null);
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
        const storedDataset = hydrateDataset(store, DATASET_KEY);
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

    const setDataset = useCallback((next: readonly ColumnInference[]): void => {
        setDatasetState(next);
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(DATASET_KEY, JSON.stringify(next));
        }
    }, []);

    const clearDataset = useCallback((): void => {
        setDatasetState(null);
        setReceiptState(null);
        setChartKindState(null);
        if (typeof window === "undefined") {
            return;
        }
        window.sessionStorage.removeItem(DATASET_KEY);
        window.sessionStorage.removeItem(RECEIPT_KEY);
        window.sessionStorage.removeItem(CHART_KIND_KEY);
    }, []);

    const setChartSlug = useCallback((next: ChartSlug | null): void => {
        setChartSlugState(next);
    }, []);

    const setChartSpec = useCallback((next: ChartSpec | null): void => {
        setChartSpecState(next);
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
            receipt,
            setReceipt,
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
            receipt,
            setReceipt,
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
