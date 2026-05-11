import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole, Mapping } from "@/app/providers";

import { ROLE_LABELS } from "./describe";
import { ROLE_TYPE_COMPATIBILITY } from "./requirements";

export type ValidationStatus = "valid" | "incomplete" | "type-mismatch";

export type ValidationResult = {
    readonly status: ValidationStatus;
    readonly message: string;
};

/**
 * Validation pass over a Mapping against the current dataset.
 * V1 rule: at least one role must be assigned, and every assigned column must satisfy the role's type.
 * The role-select already filters to compatible options, so "type-mismatch" only fires on stale state
 * (e.g. a persisted mapping where the underlying column changed type after a re-parse).
 */
export const validateMapping = (
    mapping: Mapping,
    inferences: readonly ColumnInference[],
): ValidationResult => {
    const entries = Object.entries(mapping) as readonly [ColumnRole, string | undefined][];
    const assigned = entries.filter(([role, col]) => role !== "ignore" && col !== undefined);

    if (assigned.length === 0) {
        return { status: "incomplete", message: "Assign at least one column to a chart role." };
    }

    const byName = new Map(inferences.map((c) => [c.name, c]));
    for (const [role, col] of assigned) {
        const inf = col === undefined ? undefined : byName.get(col);
        if (inf === undefined) {
            return {
                status: "incomplete",
                message: `${ROLE_LABELS[role]} references a column that no longer exists.`,
            };
        }
        const allowed = ROLE_TYPE_COMPATIBILITY[role];
        if (!allowed.includes(inf.primaryType)) {
            return {
                status: "type-mismatch",
                message: `${ROLE_LABELS[role]} expects ${allowed.join(" or ")} — "${col}" is ${inf.primaryType}.`,
            };
        }
    }

    return { status: "valid", message: `${assigned.length} role${assigned.length === 1 ? "" : "s"} mapped.` };
};

/** Reverse lookup: role assigned to a given column, or "ignore" if none. */
export const roleForColumn = (mapping: Mapping, columnName: string): ColumnRole => {
    const entries = Object.entries(mapping) as readonly [ColumnRole, string | undefined][];
    for (const [role, col] of entries) {
        if (col === columnName) {
            return role;
        }
    }

    return "ignore";
};

/** How many distinct columns are assigned to non-ignore roles. */
export const countAssigned = (mapping: Mapping): number => {
    return Object.entries(mapping).filter(([role, col]) => role !== "ignore" && col !== undefined).length;
};
