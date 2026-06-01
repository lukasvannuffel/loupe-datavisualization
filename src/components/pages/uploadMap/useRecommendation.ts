"use client";

import { useRef, useState } from "react";

import { recommendChart } from "@/lib/ai/recommendChart";
import type { RecommendPayload, RecommendResult } from "@/lib/ai/recommendChart.types";
import { getCacheEntry, setCacheEntry } from "@/lib/ai/recommendCache/cache";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

export type RecommendationState =
    | { status: "idle" }
    | { status: "loading"; fromCache: false }
    | { status: "success"; receipt: Receipt; chartKind: ChartSpec["kind"]; fromCache: boolean }
    | { status: "error"; code: Extract<RecommendResult, { ok: false }>["code"]; message: string };

type Options = {
    readonly onSuccess?: (receipt: Receipt, chartKind: ChartSpec["kind"], fromCache: boolean) => void;
};

export const useRecommendation = (
    options?: Options,
): { readonly reset: () => void; readonly run: (payload: RecommendPayload) => Promise<void>; readonly state: RecommendationState } => {
    const [state, setState] = useState<RecommendationState>({ status: "idle" });
    const rateLimitedRef = useRef(false);
    const isRunningRef = useRef(false);

    const run = async (payload: RecommendPayload): Promise<void> => {
        if (isRunningRef.current) {
            return;
        }

        isRunningRef.current = true;

        try {
            const cached = await getCacheEntry(payload);
            if (cached.ok) {
                setState({
                    chartKind: cached.entry.chartKind,
                    fromCache: true,
                    receipt: cached.entry.receipt,
                    status: "success",
                });
                options?.onSuccess?.(cached.entry.receipt, cached.entry.chartKind, true);

                return;
            }

            if (rateLimitedRef.current) {
                return;
            }

            setState({ fromCache: false, status: "loading" });

            const result: RecommendResult = await recommendChart(payload);
            if (result.ok) {
                await setCacheEntry(payload, result.receipt, result.chartType, result.costEstimateEur);
                setState({
                    chartKind: result.chartType,
                    fromCache: false,
                    receipt: result.receipt,
                    status: "success",
                });
                options?.onSuccess?.(result.receipt, result.chartType, false);

                return;
            }
            rateLimitedRef.current = result.code === "RATE_LIMITED";
            setState({ code: result.code, message: result.message, status: "error" });
        } finally {
            isRunningRef.current = false;
        }
    };

    return {
        reset: () => {
            rateLimitedRef.current = false;
            isRunningRef.current = false;
            setState({ status: "idle" });
        },
        run,
        state,
    };
};
