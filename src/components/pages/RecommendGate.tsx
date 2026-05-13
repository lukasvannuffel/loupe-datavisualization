"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";

import { Recommendation } from "./Recommendation";

export const RecommendGate = (): JSX.Element | null => {
    const router = useRouter();
    const { chartKind, hydrated, lastRecommendationFromCache, receipt } = useAppState();

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (!receipt || !chartKind) {
            router.replace("/upload/map");
        }
    }, [chartKind, hydrated, receipt, router]);

    if (!hydrated || !receipt || !chartKind) {
        return null;
    }

    return <Recommendation chartKind={chartKind} fromCache={lastRecommendationFromCache} receipt={receipt} />;
};
