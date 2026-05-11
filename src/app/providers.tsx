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

const isInferenceArray = (v: unknown): v is readonly ColumnInference[] =>
    Array.isArray(v) &&
    v.every(
        (c) =>
            c !== null &&
            typeof c === "object" &&
            typeof (c as { name?: unknown }).name === "string" &&
            typeof (c as { primaryType?: unknown }).primaryType === "string",
    );

const isMapping = (v: unknown): v is Mapping =>
    v !== null && typeof v === "object" && !Array.isArray(v);

export const AppStateProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [intent, setIntentState] = useState<string>("");
    const [mapping, setMappingState] = useState<Mapping>({});
    const [dataset, setDatasetState] = useState<readonly ColumnInference[] | null>(null);
    const [chartSlug, setChartSlug] = useState<ChartSlug | null>(null);
    const hydrated = useRef<boolean>(false);

    useEffect(() => {
        if (typeof window === "undefined" || hydrated.current) {
            return;
        }
        hydrated.current = true;

        const store = window.sessionStorage;
        const storedIntent = store.getItem(INTENT_KEY);
        if (storedIntent !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIntentState(storedIntent);
        }
        const storedDataset = safeParse(store.getItem(DATASET_KEY), isInferenceArray);
        if (storedDataset !== null) {
            setDatasetState(storedDataset);
        }
        const storedMapping = safeParse(store.getItem(MAPPING_KEY), isMapping);
        if (storedMapping !== null) {
            setMappingState(storedMapping);
        }
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
        [intent, setIntent, mapping, setMapping, dataset, setDataset, clearDataset, chartSlug],
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
