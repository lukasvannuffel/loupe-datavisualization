"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type { ChartSlug } from "@/components/charts/chartPreviews";

const INTENT_STORAGE_KEY = "loupe.intent";

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

type AppState = {
    intent: string;
    setIntent: (next: string) => void;
    mapping: Record<string, ColumnRole>;
    setMapping: (next: Record<string, ColumnRole>) => void;
    chartSlug: ChartSlug | null;
    setChartSlug: (next: ChartSlug | null) => void;
};

const AppStateContext = createContext<AppState | null>(null);

export const AppStateProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [intent, setIntentState] = useState<string>("");
    const [mapping, setMapping] = useState<Record<string, ColumnRole>>({});
    const [chartSlug, setChartSlug] = useState<ChartSlug | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const stored = window.sessionStorage.getItem(INTENT_STORAGE_KEY);
        if (stored !== null) {
            // Hydrate persisted intent on mount; SSR-safe via the typeof window guard above.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIntentState(stored);
        }
    }, []);

    const setIntent = useCallback((next: string): void => {
        setIntentState(next);

        if (typeof window !== "undefined") {
            window.sessionStorage.setItem(INTENT_STORAGE_KEY, next);
        }
    }, []);

    const value = useMemo<AppState>(
        () => ({
            intent,
            setIntent,
            mapping,
            setMapping,
            chartSlug,
            setChartSlug,
        }),
        [intent, setIntent, mapping, chartSlug],
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
