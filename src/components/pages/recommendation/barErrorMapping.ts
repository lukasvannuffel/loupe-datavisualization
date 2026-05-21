import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole, Mapping } from "@/lib/roles/types";

const OUTCOME_NAME = /(outcome|response|bp|pressure|reduction|systolic|diastolic|mean|value|score|level|change)/i;

/**
 * Bar charts need group + outcome. Auto-map only seeds group; this fills outcome on /recommend
 * from the first unused numeric column (name hint preferred) without changing strict map-step rules.
 */
export const mappingForBarError = (
    mapping: Mapping,
    inferences: readonly ColumnInference[],
): Mapping => {
    if (mapping.group !== undefined && mapping.outcome !== undefined) {
        return mapping;
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
        return mapping;
    }

    return { ...mapping, outcome };
};
