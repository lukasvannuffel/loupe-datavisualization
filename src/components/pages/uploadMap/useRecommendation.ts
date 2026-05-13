"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { recommendChart } from "@/lib/ai/recommendChart";
import type { RecommendPayload, RecommendResult } from "@/lib/ai/recommendChart.types";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

export type RecommendationOnSuccess = (
    payload: {
        readonly receipt: Receipt;
        readonly chartKind: ChartSpec["kind"];
    },
    resetRecommendation: () => void,
) => void;

export type RecommendationState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; receipt: Receipt; chartKind: ChartSpec["kind"] }
    | {
          status: "error";
          code: Extract<RecommendResult, { ok: false }>["code"];
          message: string;
      };

type UseRecommendationOptions = {
    readonly onSuccess?: RecommendationOnSuccess;
};

export const useRecommendation = (
    options?: UseRecommendationOptions,
): {
    readonly reset: () => void;
    readonly run: (payload: RecommendPayload) => Promise<void>;
    readonly state: RecommendationState;
} => {
    const optionsRef = useRef(options);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const [state, setState] = useState<RecommendationState>({ status: "idle" });

    const reset = useCallback((): void => {
        setState({ status: "idle" });
    }, []);

    const run = useCallback(async (payload: RecommendPayload): Promise<void> => {
        setState({ status: "loading" });
        const result: RecommendResult = await recommendChart(payload);

        if (result.ok) {
            optionsRef.current?.onSuccess?.(
                {
                    chartKind: result.chartType,
                    receipt: result.receipt,
                },
                reset,
            );
            setState({
                chartKind: result.chartType,
                receipt: result.receipt,
                status: "success",
            });

            return;
        }

        setState({ code: result.code, message: result.message, status: "error" });
    }, [reset]);

    return { reset, run, state };
};
