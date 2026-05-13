"use client";

import { useState } from "react";

import { recommendChart } from "@/lib/ai/recommendChart";
import type { RecommendPayload, RecommendResult } from "@/lib/ai/recommendChart.types";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

export type RecommendationState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; receipt: Receipt; chartKind: ChartSpec["kind"] }
    | { status: "error"; code: string; message: string };

export const useRecommendation = (): {
    readonly reset: () => void;
    readonly run: (payload: RecommendPayload) => Promise<void>;
    readonly state: RecommendationState;
} => {
    const [state, setState] = useState<RecommendationState>({ status: "idle" });

    const run = async (payload: RecommendPayload): Promise<void> => {
        setState({ status: "loading" });
        const result: RecommendResult = await recommendChart(payload);

        if (result.ok) {
            setState({
                chartKind: result.chartType,
                receipt: result.receipt,
                status: "success",
            });

            return;
        }

        setState({ code: result.code, message: result.message, status: "error" });
    };

    const reset = (): void => {
        setState({ status: "idle" });
    };

    return { reset, run, state };
};
