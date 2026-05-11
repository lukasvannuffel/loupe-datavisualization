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
import { columnInferenceArraySchema } from "@/lib/parser/inference.schemas";
import type { ColumnInference } from "@/lib/parser/inference.types";

const INTENT_KEY = "loupe.intent";
const DATASET_KEY = "loupe.dataset";
const MAPPING_KEY = "loupe.mapping";

export type ColumnRole =
    | "time"
    | "event"
    | "group"
    | "outcome"
    | "predictor"
    | "x"
    | "y"
    | "id"
    | "ignore";

export type Mapping = Partial<Record<ColumnRole, string>>;

type AppState = {
    readonly hydrated: boolean;
    readonly intent: string;
    readonly setIntent: (next: string) => void;
    readonly mapping: Mapping;
    readonly setMapping: (next: Mapping) => void;
    readonly dataset: readonly ColumnInference[] | null;
    readonly setDataset: (next: readonly ColumnInference[]) => void;
    readonly clearDataset: () => void;
    readonly chartSlug: ChartSlug | null;
    readonly setChartSlug: (next: ChartSlug | null) => void;
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

const isMapping = (v: unknown): v is Mapping =>
    v !== null && typeof v === "object" && !Array.isArray(v);

export const AppStateProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [intent, setIntentState] = useState<string>("");
    const [mapping, setMappingState] = useState<Mapping>({});
    const [dataset, setDatasetState] = useState<readonly ColumnInference[] | null>(null);
    const [chartSlug, setChartSlug] = useState<ChartSlug | null>(null);
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
        const storedMapping = safeParse(store.getItem(MAPPING_KEY), isMapping);
        if (storedMapping !== null) {
            setMappingState(storedMapping);
        }
        setHydrated(true);
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
        if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(DATASET_KEY);
        }
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
            chartSlug,
            setChartSlug,
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
            chartSlug,
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
