import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole, Mapping } from "@/lib/roles/types";

const OUTCOME_NAME =
    /(outcome|response|uitkomst|resultaat|bp|bloeddruk|pressure|reduction|systolic|diastolic|mean|value|score|level|change|afname|verandering)/i;

export type BarErrorMappingResult = {
    readonly mapping: Mapping;
    /** Set when outcome was guessed from column names — show a breadcrumb on /recommend. */
    readonly inferredOutcome?: string;
};

/**
 * Bar charts need group + outcome. Seeds outcome from the first unused numeric column
 * (name hint preferred) when the map step left outcome empty.
 */
export const mappingForBarError = (
    mapping: Mapping,
    inferences: readonly ColumnInference[],
): BarErrorMappingResult => {
    if (mapping.group !== undefined && mapping.outcome !== undefined) {
        return { mapping };
    }

    const used = new Set(
        (Object.entries(mapping) as readonly [ColumnRole, string | undefined][])
            .filter(([role, col]) => role !== "ignore" && col !== undefined)
            .map(([, col]) => col as string),
    );

    const numerics = inferences.filter(
        (col) =>
            (col.primaryType === "numeric" || col.primaryType === "integer") &&
            !used.has(col.name) &&
            col.name !== mapping.group,
    );

    const outcome =
        numerics.find((col) => OUTCOME_NAME.test(col.name))?.name ?? numerics[0]?.name;

    if (outcome === undefined) {
        return { mapping };
    }

    const hadOutcome = mapping.outcome !== undefined;

    return {
        mapping: { ...mapping, outcome },
        inferredOutcome: hadOutcome ? undefined : outcome,
    };
};
