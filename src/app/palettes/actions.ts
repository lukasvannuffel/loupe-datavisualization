"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

import {
    createPaletteSchema,
    paletteColorsSchema,
    renamePaletteSchema,
    type UserPalette,
} from "./schemas";

export type CreatePalettePayload = {
    readonly name: string;
    readonly colors: readonly string[];
};

export type RenamePalettePayload = {
    readonly id: string;
    readonly name: string;
};

export type PaletteMutationResult =
    | { readonly success: true; readonly palette: UserPalette }
    | { readonly success: false; readonly error: string };

export type DeletePaletteResult =
    | { readonly success: true }
    | { readonly success: false; readonly error: string };

const mapPaletteRow = (row: {
    readonly id: unknown;
    readonly name: unknown;
    readonly colors: unknown;
}): UserPalette | null => {
    if (typeof row.id !== "string" || typeof row.name !== "string") {
        return null;
    }

    const parsedColors = paletteColorsSchema.safeParse(row.colors);
    if (!parsedColors.success) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        colors: parsedColors.data,
    };
};

export const listPalettes = async (): Promise<readonly UserPalette[]> => {
    try {
        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError !== null || user === null) {
            return [];
        }

        const { data, error } = await supabase
            .from("palettes")
            .select("id, name, colors")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error !== null || data === null) {
            console.error("[listPalettes]", error);

            return [];
        }

        return data
            .map((row) => mapPaletteRow(row))
            .filter((palette): palette is UserPalette => palette !== null);
    } catch (error) {
        console.error("[listPalettes] unexpected", error);

        return [];
    }
};

export const createPalette = async (
    payload: CreatePalettePayload,
): Promise<PaletteMutationResult> => {
    try {
        const parsed = createPaletteSchema.parse(payload);
        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError !== null || user === null) {
            return { success: false, error: "Not authenticated" };
        }

        const { data, error } = await supabase
            .from("palettes")
            .insert({
                user_id: user.id,
                name: parsed.name,
                colors: parsed.colors,
            })
            .select("id, name, colors")
            .single();

        if (error !== null || data === null) {
            return { success: false, error: error?.message ?? "Insert failed" };
        }

        const palette = mapPaletteRow(data);
        if (palette === null) {
            return { success: false, error: "Invalid palette row" };
        }

        revalidatePath("/dashboard");
        revalidatePath("/export");

        return { success: true, palette };
    } catch (error) {
        console.error("[createPalette]", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Create failed",
        };
    }
};

export const renamePalette = async (
    payload: RenamePalettePayload,
): Promise<PaletteMutationResult> => {
    try {
        const parsed = renamePaletteSchema.parse(payload);
        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError !== null || user === null) {
            return { success: false, error: "Not authenticated" };
        }

        const { data, error } = await supabase
            .from("palettes")
            .update({ name: parsed.name })
            .eq("id", parsed.id)
            .eq("user_id", user.id)
            .select("id, name, colors")
            .single();

        if (error !== null || data === null) {
            return { success: false, error: error?.message ?? "Rename failed" };
        }

        const palette = mapPaletteRow(data);
        if (palette === null) {
            return { success: false, error: "Invalid palette row" };
        }

        revalidatePath("/dashboard");
        revalidatePath("/export");

        return { success: true, palette };
    } catch (error) {
        console.error("[renamePalette]", error);

        return {
            success: false,
            error: error instanceof Error ? error.message : "Rename failed",
        };
    }
};

export const deletePalette = async (id: string): Promise<DeletePaletteResult> => {
    try {
        const supabase = createClient(await cookies());
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError !== null || user === null) {
            return { success: false, error: "Not authenticated" };
        }

        const { error } = await supabase
            .from("palettes")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error !== null) {
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard");
        revalidatePath("/export");

        return { success: true };
    } catch (error) {
        console.error("[deletePalette]", error);

        return { success: false, error: "Delete failed" };
    }
};
