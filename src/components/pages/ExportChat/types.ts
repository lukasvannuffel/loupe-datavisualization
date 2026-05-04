import type { ChartSlug } from "@/components/charts/chartPreviews";
import type { StatAnnotation } from "@/components/charts/types";

export type ChartConfig = {
    chartSlug: ChartSlug;
    paletteId: string;
    title: string;
    eyebrow: string;
    figureNumber: string;
    caption: string;
    xLabel: string;
    yLabel: string;
    legendA: string;
    legendB: string;
    showLegend: boolean;
    showAtRisk: boolean;
    showStats: boolean;
    showGrid: boolean;
    dashB: boolean;
    strokeWeight: number;
    errorBarType: "sd" | "sem" | "ci95";
    annotations: readonly StatAnnotation[];
};

export type RailSection =
    | "colors"
    | "titles"
    | "axes"
    | "legend"
    | "annotations"
    | "errorBars";

export type RailHint = {
    section: RailSection;
    copy: string;
};

export type ChatRole = "user" | "ai";

export type ChatMessage = {
    id: string;
    role: ChatRole;
    text: string;
    ts: number;
    railHint?: RailHint;
};

export type ChatRevision = {
    id: string;
    ts: number;
    entry: string;
};

export type ScriptedCategory =
    | "annotation"
    | "refit"
    | "explain"
    | "preset"
    | "rail"
    | "fallback";

export type ScriptedExchange = {
    readonly id: string;
    readonly category: ScriptedCategory;
    readonly match: readonly (string | RegExp)[];
    readonly userEcho: string;
    readonly response: string;
    readonly patch?: Partial<ChartConfig>;
    readonly receiptEntry?: string;
    readonly railHint?: RailHint;
};
