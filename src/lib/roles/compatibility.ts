import type { SpecKind } from "@/lib/chartSpec/types";
import type { ColumnRole, Mapping } from "@/app/providers";

import { ROLE_LABELS } from "./describe";
import { ROLE_REQUIREMENTS_BY_INTENT, type ChartIntent } from "./requirements";

/**
 * Bridge between the chart-spec discriminator (`SpecKind`) and the role-
 * requirements discriminator (`ChartIntent`). The two were defined independently
 * — kebab-case in `requirements.ts`, camelCase in `chartSpec/types.ts` — and
 * deliberately not merged so neither file needs to import the other.
 */
export const SPEC_KIND_TO_INTENT: Readonly<Record<SpecKind, ChartIntent>> = {
    km: "km",
    barError: "bar-error",
    roc: "roc",
    forest: "forest",
};

export type ChartCompatibility = {
    readonly compatible: boolean;
    readonly missingRoles: readonly ColumnRole[];
    readonly missingLabels: readonly string[];
};

/**
 * Pure compatibility check: for each V1 chart kind, does the current mapping
 * satisfy every required role? Missing roles are surfaced as both the raw
 * `ColumnRole` value (for behaviour) and a human-facing label drawn from
 * `ROLE_LABELS` (for UI copy) — no fabricated strings.
 *
 * Type-mismatch validation is intentionally out of scope; this helper only
 * answers "are the required roles assigned?". `validateMapping` is the canonical
 * place for type checks once a chart is chosen.
 */
export const getCompatibility = (
    mapping: Mapping,
): Readonly<Record<SpecKind, ChartCompatibility>> => {
    const result = {} as Record<SpecKind, ChartCompatibility>;
    const assigned = new Set<ColumnRole>(
        (Object.entries(mapping) as readonly [ColumnRole, string | undefined][])
            .filter(([role, col]) => role !== "ignore" && col !== undefined)
            .map(([role]) => role),
    );

    for (const kind of Object.keys(SPEC_KIND_TO_INTENT) as readonly SpecKind[]) {
        const intent = SPEC_KIND_TO_INTENT[kind];
        const required = ROLE_REQUIREMENTS_BY_INTENT[intent].required;
        const missingRoles = required.filter((role) => !assigned.has(role));
        result[kind] = {
            compatible: missingRoles.length === 0,
            missingRoles,
            missingLabels: missingRoles.map((role) => ROLE_LABELS[role]),
        };
    }

    return result;
};
