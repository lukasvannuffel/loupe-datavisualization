import { detectSemantic } from "./detectors/semantic";
import { resolvePrimary } from "./detectors/primary";
import type { ColumnInference } from "./inference.types";
import type { ParseResult } from "./types";

export const INFERENCE_SAMPLE_SIZE = 1000;

/**
 * Infers a `ColumnInference` per header from a `ParseResult`.
 * Privacy contract: returns schema-only data — never row arrays; at most 5 sample values per column.
 * Performance: reads at most `INFERENCE_SAMPLE_SIZE` rows per column (skips empty/whitespace cells).
 */
export const inferColumnTypes = (parseResult: ParseResult): readonly ColumnInference[] => {
    const { headers, rows } = parseResult;
    const cap = Math.min(rows.length, INFERENCE_SAMPLE_SIZE);

    return headers.map((name) => {
        const values: string[] = [];
        let nullCount = 0;
        for (let i = 0; i < cap; i++) {
            const v = rows[i][name];
            if (v === undefined || v.trim() === "") {
                nullCount++;
                continue;
            }
            values.push(v);
        }
        const uniqueCount = new Set(values).size;
        const primary = resolvePrimary(values);
        const tag = detectSemantic(name, primary.primaryType, values, uniqueCount);
        const finalPrimary =
            tag === "patient-id" && (primary.primaryType === "integer" || primary.primaryType === "numeric")
                ? "categorical"
                : primary.primaryType;

        return {
            name,
            primaryType: finalPrimary,
            semanticTag: tag,
            confidence: primary.confidence,
            reasons: primary.reasons,
            nullCount,
            uniqueCount,
            sampleValues: values.slice(0, 5),
        };
    });
};
