import type { RecommendResult } from "@/lib/ai/recommendChart.types";

export type RecommendErrorCode = Extract<RecommendResult, { ok: false }>["code"];

export const recommendationErrorCopy = (
    code: RecommendErrorCode,
): { readonly description: string; readonly title: string; readonly variant: "error" | "warning" } => {
    if (code === "RATE_LIMITED") {
        return {
            description: "Wait a while, then try again or pick a chart manually.",
            title: "Too many recommendations.",
            variant: "warning",
        };
    }

    if (code === "PRIVACY_VIOLATION") {
        return {
            description: "Rename sensitive columns, then try again.",
            title: "Patient data cannot leave your device.",
            variant: "error",
        };
    }

    if (code === "VALIDATION_FAILED") {
        return {
            description: "Check your column mapping and intent, then try again.",
            title: "Could not analyse your dataset.",
            variant: "error",
        };
    }

    return {
        description: "Check your connection and try again.",
        title: "Could not get chart recommendation.",
        variant: "error",
    };
};
