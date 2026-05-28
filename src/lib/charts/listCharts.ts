import "server-only";

import { cookies } from "next/headers";

import type { DashboardChartKind } from "@/lib/thumbnail/chartKindIcons";
import { createClient } from "@/utils/supabase/server";

export type ChartListItem = {
    readonly id: string;
    readonly name: string;
    readonly chart_kind: DashboardChartKind;
    readonly thumbnail: string | null;
    readonly updated_at: string;
    readonly created_at: string;
};

const isDashboardChartKind = (value: unknown): value is DashboardChartKind =>
    value === "bar" || value === "km" || value === "box" || value === "xy";

export const listCharts = async (): Promise<readonly ChartListItem[]> => {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
        .from("charts")
        .select("id, name, chart_kind, thumbnail, updated_at, created_at")
        .order('updated_at', { ascending: false });

    if (error !== null) {
        console.error("[listCharts]", error);

        return [];
    }

    return (data ?? []).filter((item): item is ChartListItem => {
        return (
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            isDashboardChartKind(item.chart_kind) &&
            (typeof item.thumbnail === "string" || item.thumbnail === null) &&
            typeof item.updated_at === "string" &&
            typeof item.created_at === "string"
        );
    });
};
