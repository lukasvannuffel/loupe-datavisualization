import type { ColumnInference } from "@/lib/parser/inference.types";
import type { PrivateRows } from "@/lib/parser/types";

/** Max distinct x-axis values for visit-style schedules (clinical trials rarely exceed 10). */
export const MAX_X_UNIQUE_VALUES = 10;

const DROPOUT_SLACK_RATIO = 0.15;

/** Matches autoMap ID column naming — do not treat sex/arm/etc. as patient IDs. */
const ID_NAME = /^(id|subject|(patient|record)[._-]?id|patientid|recordid)$/i;

const isIdLikeColumn = (col: ColumnInference): boolean =>
    col.semanticTag === "patient-id" || ID_NAME.test(col.name);

const countUniqueIdXPairs = (
    rows: PrivateRows,
    idColumn: string,
    xColumn: string,
): number => {
    const pairs = new Set<string>();
    for (const row of rows) {
        const id = row[idColumn]?.trim() ?? "";
        const x = row[xColumn]?.trim() ?? "";
        if (id.length === 0 || x.length === 0) {
            continue;
        }
        pairs.add(`${id}\0${x}`);
    }

    return pairs.size;
};

export type LongitudinalDetection =
    | { readonly isLongitudinal: false }
    | {
          readonly isLongitudinal: true;
          readonly idColumn: string;
          readonly visitColumn: string;
          readonly valueColumn: string;
      };

/**
 * Detects repeated-measures (longitudinal) structure in tabular data.
 *
 * When all checks pass, route to line mode + longitudinal aggregation instead of
 * raw scatter passthrough. Local only — no LLM call.
 */
export const detectLongitudinal = (
    rows: PrivateRows,
    columns: readonly ColumnInference[],
    proposedXColumn: string,
    proposedYColumn: string,
    proposedGroupColumn: string | null,
): LongitudinalDetection => {
    if (rows.length === 0) {
        return { isLongitudinal: false };
    }

    const idCandidates = columns.filter(
        (col) =>
            isIdLikeColumn(col) &&
            col.name !== proposedGroupColumn &&
            col.name !== proposedXColumn &&
            col.name !== proposedYColumn &&
            col.uniqueCount > 1 &&
            col.uniqueCount < rows.length / 2,
    );

    const idCandidate =
        idCandidates.find((col) => col.semanticTag === "patient-id") ??
        idCandidates.find((col) => ID_NAME.test(col.name));
    if (idCandidate === undefined) {
        return { isLongitudinal: false };
    }

    const xMeta = columns.find((col) => col.name === proposedXColumn);
    if (xMeta === undefined || xMeta.uniqueCount > MAX_X_UNIQUE_VALUES) {
        return { isLongitudinal: false };
    }

    const uniquePairs = countUniqueIdXPairs(rows, idCandidate.name, proposedXColumn);
    const slack = Math.max(1, Math.floor(rows.length * DROPOUT_SLACK_RATIO));
    if (Math.abs(uniquePairs - rows.length) > slack) {
        return { isLongitudinal: false };
    }

    return {
        isLongitudinal: true,
        idColumn: idCandidate.name,
        visitColumn: proposedXColumn,
        valueColumn: proposedYColumn,
    };
};
