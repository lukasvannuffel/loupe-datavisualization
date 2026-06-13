import { z } from "zod";

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const paletteColorsSchema = z.array(hexColorSchema).min(1).max(8);

export const createPaletteSchema = z
    .object({
        name: z.string().min(1).max(60),
        colors: paletteColorsSchema,
    })
    .strict();

export const renamePaletteSchema = z
    .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(60),
    })
    .strict();

export type UserPalette = {
    readonly id: string;
    readonly name: string;
    readonly colors: readonly string[];
};

export const parseHexInput = (input: string): readonly string[] =>
    input
        .split(",")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

export const parseValidHexColors = (input: string): readonly string[] => {
    const tokens = parseHexInput(input);

    return tokens.filter((token) => hexColorSchema.safeParse(token).success);
};

export const isUuidPaletteId = (value: string): boolean =>
    /^[0-9a-f-]{36}$/i.test(value);
