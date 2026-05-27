"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { chartSpecSchema, plotDataSchema } from "@/lib/chartSpec/schemas";
import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";
import { assertNoRawRows } from "@/lib/privacy/assertNoRawRows";
import { computeConfigHash } from "@/lib/receipt/configHash";
import { receiptSchema } from "@/lib/receipt/schemas";
import type { Mapping } from "@/lib/roles/types";
import { createClient } from "@/utils/supabase/server";

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
};

export type SaveChartResult =
    | { readonly success: true; readonly id: string }
    | { readonly success: false; readonly error: string };

const payloadSchema = z
    .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(200),
        chart_spec: chartSpecSchema,
        column_mapping: columnMappingSchema,
        receipt: receiptSchema,
        plot_data: plotDataSchema,
    })
    .strict();

export const saveChart = async (payload: SaveChartPayload): Promise<SaveChartResult> => {
    try {
        const parsed = payloadSchema.parse(payload);
        assertNoRawRows(parsed.chart_spec, parsed.plot_data);

        const recomputedHash = await computeConfigHash(parsed.chart_spec);
        if (recomputedHash !== parsed.receipt.config_hash) {
            return {
                success: false,
                error: `Receipt config_hash mismatch: client sent ${parsed.receipt.config_hash}, server computed ${recomputedHash}`,
            };
        }

        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError !== null || user === null) {
            return { success: false, error: "Not authenticated" };
        }

        if (parsed.id !== undefined) {
            const { error } = await supabase
                .from("charts")
                .update({
                    name: parsed.name,
                    chart_spec: parsed.chart_spec,
                    column_mapping: parsed.column_mapping,
                    receipt: parsed.receipt,
                })
                .match({ id: parsed.id, user_id: user.id });

            if (error !== null) {
                return { success: false, error: error.message };
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
