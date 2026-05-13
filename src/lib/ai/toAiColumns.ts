import type { ColumnInference } from "@/lib/parser/inference.types";

import type { AiColumn } from "./recommendChart.types";

/**
 * Explicit field copy — never spread ColumnInference. New fields added to
 * ColumnInference (e.g. range, sampleValues, reasons) must NOT silently flow
 * into the AI payload. Privacy is enforced by exhaustive listing here.
 */
export const toAiColumns = (
    inferences: ReadonlyArray<ColumnInference>,
): ReadonlyArray<AiColumn> =>
    inferences.map((i) => ({
        name: i.name,
        primaryType: i.primaryType,
        ...(i.semanticTag !== undefined ? { semanticTag: i.semanticTag } : {}),
        nullCount: i.nullCount,
        uniqueCount: i.uniqueCount,
    }));
