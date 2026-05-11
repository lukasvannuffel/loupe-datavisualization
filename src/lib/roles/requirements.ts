import type { PrimaryType } from "@/lib/parser/inference.types";
import type { ColumnRole } from "@/app/providers";

/**
 * Which primary types are acceptable for each chart role.
 * Used by the role-select dropdown to filter options per column,
 * and by `validateMapping` to spot type-mismatches the user picked anyway.
 */
export const ROLE_TYPE_COMPATIBILITY: Readonly<Record<ColumnRole, readonly PrimaryType[]>> = {
    time: ["numeric", "integer"],
    event: ["binary", "integer"],
    group: ["categorical", "binary"],
    outcome: ["numeric", "integer", "binary"],
    predictor: ["numeric", "integer", "categorical", "binary"],
    x: ["numeric", "integer", "date", "datetime"],
    y: ["numeric", "integer"],
    id: ["categorical", "integer"],
    ignore: [],
};

export type ChartIntent = "km" | "bar-error" | "roc" | "forest" | "any";

/** Which roles are required (vs optional) per chart intent. V1 intents only. */
export const ROLE_REQUIREMENTS_BY_INTENT: Readonly<
    Record<ChartIntent, { readonly required: readonly ColumnRole[]; readonly optional: readonly ColumnRole[] }>
> = {
    km: {
        required: ["time", "event"],
        optional: ["group", "id"],
    },
    "bar-error": {
        required: ["group", "outcome"],
        optional: ["id"],
    },
    roc: {
        required: ["predictor", "outcome"],
        optional: ["group", "id"],
    },
    forest: {
        required: ["group", "outcome"],
        optional: ["predictor", "id"],
    },
    any: {
        required: [],
        optional: ["time", "event", "group", "outcome", "predictor", "x", "y", "id"],
    },
};
