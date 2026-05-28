"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { resolvePalette } from "@/lib/chartSpec/resolvePalette";
import { chartSpecSchema } from "@/lib/chartSpec/schemas";
import type { ChartSpec, PlotData, SpecKind } from "@/lib/chartSpec/types";
import { assertNoRawRows } from "@/lib/privacy/assertNoRawRows";
import { computeConfigHash } from "@/lib/receipt/configHash";
import { methodString } from "@/lib/receipt/methodStrings";
import { sampleString } from "@/lib/receipt/sampleStrings";
import { receiptSchema } from "@/lib/receipt/schemas";
import type { Mapping } from "@/lib/roles/types";
import { createClient } from "@/utils/supabase/server";
import packageJson from "../../../package.json";

const columnMappingSchema = z
    .object({
        time: z.string().optional(),
        event: z.string().optional(),
        group: z.string().optional(),
        outcome: z.string().optional(),
        predictor: z.string().optional(),
        x: z.string().optional(),
        y: z.string().optional(),
        id: z.string().optional(),
        ignore: z.string().optional(),
    })
    .strict();

export type SaveChartPayload = {
    readonly id?: string;
    readonly name: string;
    readonly chart_spec: ChartSpec;
    readonly column_mapping: Mapping;
    readonly receipt: z.infer<typeof receiptSchema>;
    readonly plot_data: PlotData;
    readonly thumbnail: string;
};

export type SaveChartResult =
    | { readonly success: true; readonly id: string }
    | { readonly success: false; readonly error: string };
export type DeleteChartResult =
    | { readonly success: true }
    | { readonly success: false; readonly error: string };
export type ChartRow = {
    readonly id: string;
    readonly name: string;
    readonly chart_spec: ChartSpec;
    readonly column_mapping: Mapping;
    readonly receipt: z.infer<typeof receiptSchema>;
    readonly plot_data: PlotData | null;
    readonly thumbnail: string | null;
    readonly chart_kind: "bar" | "box" | "km" | "xy" | null;
    readonly created_at: string;
    readonly updated_at: string;
};

const payloadSchema = z
    .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(200),
        chart_spec: chartSpecSchema,
        column_mapping: columnMappingSchema,
        receipt: receiptSchema,
        plot_data: z.unknown(),
        thumbnail: z.string().min(1).max(200_000).regex(/^data:image\/(png|svg\+xml);/),
    })
    .strict();

const GENERATED_AT_TOLERANCE_MS = 5 * 60 * 1000;
const SCATTER_PLOT_DATA_KIND = "xy";
const DASHBOARD_KIND_BY_SPEC_KIND: Record<SpecKind, "bar" | "box" | "km" | "xy"> = {
    barError: "bar",
    box: "box",
    km: "km",
    xy: "xy",
};
const isKnownChartKind = (value: unknown): value is NonNullable<ChartRow["chart_kind"]> =>
    value === "bar" || value === "box" || value === "km" || value === "xy";

const isPlotDataStorable = (chartKind: SpecKind, plotData: PlotData): boolean => {
    if (chartKind === "box") {
        return false;
    }
    if (chartKind === "xy" && plotData.kind === SCATTER_PLOT_DATA_KIND) {
        return false;
    }

    return true;
};

export const saveChart = async (payload: SaveChartPayload): Promise<SaveChartResult> => {
    try {
        const parsed = payloadSchema.parse(payload);
        const validatedPlotData = parsed.plot_data as PlotData;
        assertNoRawRows(parsed.chart_spec, validatedPlotData);
        const storablePlotData = isPlotDataStorable(parsed.chart_spec.kind, validatedPlotData)
            ? validatedPlotData
            : null;
        const chartKind = DASHBOARD_KIND_BY_SPEC_KIND[parsed.chart_spec.kind];

        const recomputedHash = await computeConfigHash(parsed.chart_spec);
        if (recomputedHash !== parsed.receipt.config_hash) {
            return {
                success: false,
                error: `Receipt config_hash mismatch: client sent ${parsed.receipt.config_hash}, server computed ${recomputedHash}`,
            };
        }
        const expectedMethod = methodString(parsed.chart_spec.kind);
        if (parsed.receipt.method !== expectedMethod) {
            return { success: false, error: "Receipt method mismatch" };
        }
        const expectedSample = sampleString(parsed.chart_spec, validatedPlotData);
        if (parsed.receipt.sample !== expectedSample) {
            return { success: false, error: "Receipt sample mismatch" };
        }
        const expectedSoftware = `Loupe v${packageJson.version} · client-side`;
        if (parsed.receipt.software !== expectedSoftware) {
            return { success: false, error: "Receipt software mismatch" };
        }
        const expectedPalette = resolvePalette(parsed.chart_spec);
        if (parsed.receipt.palette !== expectedPalette) {
            return { success: false, error: "Receipt palette mismatch" };
        }
        const expectedCsvColumns = new Set(
            Object.values(parsed.column_mapping).filter((value): value is string => typeof value === "string"),
        );
        const receivedCsvColumns = new Set(parsed.receipt.csv_columns);
        if (
            expectedCsvColumns.size !== receivedCsvColumns.size ||
            !Array.from(expectedCsvColumns).every((column) => receivedCsvColumns.has(column))
        ) {
            return { success: false, error: "Receipt csv_columns mismatch" };
        }
        const generatedAtMs = new Date(parsed.receipt.generated_at).getTime();
        if (
            Number.isNaN(generatedAtMs) ||
            Math.abs(Date.now() - generatedAtMs) > GENERATED_AT_TOLERANCE_MS
        ) {
            return {
                success: false,
                error: "Receipt generated_at outside acceptable window (±5 min of server time)",
            };
        }
        // TRUST GAP (documented): n_rows_input cannot be recomputed server-side because raw CSV rows never leave the client.
        // TRUST GAP (documented): ai_rationale is non-deterministic LLM text and cannot be reproduced exactly server-side.

        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError !== null || user === null) {
            return { success: false, error: "Not authenticated" };
        }

        if (parsed.id !== undefined) {
            const { data, error } = await supabase
                .from("charts")
                .update({
                    name: parsed.name,
                    chart_spec: parsed.chart_spec,
                    column_mapping: parsed.column_mapping,
                    receipt: parsed.receipt,
                    plot_data: storablePlotData,
                    thumbnail: parsed.thumbnail,
                    chart_kind: chartKind,
                })
                .match({ id: parsed.id, user_id: user.id })
                .select("id")
                .single();

            if (error !== null || data === null) {
                return { success: false, error: error?.message ?? "Chart not found" };
            }

            revalidatePath("/dashboard");

            return { success: true, id: parsed.id };
        }

        const { data, error } = await supabase
            .from("charts")
            .insert({
                user_id: user.id,
                name: parsed.name,
                chart_spec: parsed.chart_spec,
                column_mapping: parsed.column_mapping,
                receipt: parsed.receipt,
                plot_data: storablePlotData,
                thumbnail: parsed.thumbnail,
                chart_kind: chartKind,
            })
            .select("id")
            .single();

        if (error !== null || data === null) {
            return { success: false, error: error?.message ?? "Insert failed" };
        }

        revalidatePath("/dashboard");

        return { success: true, id: data.id as string };
    }
    catch (error) {
        console.error("[saveChart] Unexpected error:", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
};

export const getChart = async (id: string): Promise<ChartRow | null> => {
    const supabase = createClient(await cookies());
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
        return null;
    }
    const { data, error } = await supabase
        .from("charts")
        .select("id, name, chart_spec, column_mapping, receipt, plot_data, thumbnail, chart_kind, created_at, updated_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (error !== null || data === null) {
        console.error("[getChart]", error);

        return null;
    }

    const parsedSpec = chartSpecSchema.safeParse(data.chart_spec);
    if (!parsedSpec.success) {
        console.error("[getChart] chart_spec failed schema validation", parsedSpec.error.format());
        return null;
    }
    const parsedReceipt = receiptSchema.safeParse(data.receipt);
    if (!parsedReceipt.success) {
        console.error("[getChart] receipt failed schema validation", parsedReceipt.error.format());
        return null;
    }
    if (data.chart_kind !== null && !isKnownChartKind(data.chart_kind)) {
        console.error("[getChart] unknown chart_kind", data.chart_kind);
        return null;
    }
    const parsedMapping = columnMappingSchema.safeParse(data.column_mapping);
    if (!parsedMapping.success) {
        console.error("[getChart] column_mapping failed schema validation", parsedMapping.error.format());
        return null;
    }
    if (data.plot_data !== null) {
        try {
            assertNoRawRows(parsedSpec.data, data.plot_data as PlotData);
        }
        catch (error) {
            console.error("[getChart] loaded plot_data failed privacy assertion", error);
            return null;
        }
    }

    return {
        id: data.id as string,
        name: data.name as string,
        chart_spec: parsedSpec.data,
        column_mapping: parsedMapping.data,
        receipt: parsedReceipt.data,
        plot_data: (data.plot_data ?? null) as PlotData | null,
        thumbnail: (data.thumbnail ?? null) as string | null,
        chart_kind: (data.chart_kind ?? null) as ChartRow["chart_kind"],
        created_at: data.created_at as string,
        updated_at: data.updated_at as string,
    };
};

export const deleteChart = async (id: string): Promise<DeleteChartResult> => {
    try {
        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();
        if (authError !== null || user === null) {
            return { success: false, error: "Not authenticated" };
        }
        const { error } = await supabase.from("charts").delete().eq("id", id).eq("user_id", user.id);
        if (error !== null) {
            return { success: false, error: error.message };
        }
        revalidatePath("/dashboard");

        return { success: true };
    } catch (error) {
        console.error("[deleteChart]", error);

        return { success: false, error: "Delete failed" };
    }
};
