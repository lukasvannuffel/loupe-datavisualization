import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import type { BarErrorAggregation, GroupStats, MissingDataInfo } from "./barError.types";

/** Coerces a cell string to a finite number (handles European decimal commas). */
export const parseNumericCell = (raw: string): number => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return NaN;
    }
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) {
        return direct;
    }
    if (/^-?\d+,\d+$/.test(trimmed)) {
        const european = Number(trimmed.replace(",", "."));
        if (Number.isFinite(european)) {
            return european;
        }
    }

    return NaN;
};

const EMPTY_MISSING = (totalRows: number): MissingDataInfo => ({
    dropRate: 0,
    droppedRows: 0,
    missingGroupRows: 0,
    missingOutcomeRows: 0,
    totalRows,
});

/**
 * Pure aggregator. Reads raw rows, returns per-group {mean, sd, n} + drop-rate info.
 *
 * Missing-value policy: drop rows where the outcome value is null/undefined/empty
 * or cannot be coerced to a finite number, or where the group value is null/empty.
 */
export const aggregateBarError = (rows: PrivateRows, mapping: Mapping): BarErrorAggregation => {
    const groupCol = mapping.group;
    const outcomeCol = mapping.outcome;

    if (groupCol === undefined || outcomeCol === undefined) {
        return { groups: [], missing: EMPTY_MISSING(rows.length) };
    }

    let missingOutcome = 0;
    let missingGroup = 0;
    const buckets = new Map<string, number[]>();

    for (const row of rows) {
        const rawGroup = row[groupCol];
        const rawOutcome = row[outcomeCol];
        const groupTrimmed =
            typeof rawGroup === "string" ? rawGroup.trim() : rawGroup;
        const outcomeTrimmed =
            typeof rawOutcome === "string" ? rawOutcome.trim() : rawOutcome;
        const groupLabel =
            groupTrimmed === null || groupTrimmed === undefined || groupTrimmed === ""
                ? null
                : String(groupTrimmed);
        const outcomeValue =
            outcomeTrimmed === null || outcomeTrimmed === undefined || outcomeTrimmed === ""
                ? NaN
                : typeof outcomeTrimmed === "string"
                  ? parseNumericCell(outcomeTrimmed)
                  : Number(outcomeTrimmed);

        if (groupLabel === null) {
            missingGroup++;
            continue;
        }
        if (!Number.isFinite(outcomeValue)) {
            missingOutcome++;
            continue;
        }

        const bucket = buckets.get(groupLabel) ?? [];
        bucket.push(outcomeValue);
        buckets.set(groupLabel, bucket);
    }

    const groups: GroupStats[] = Array.from(buckets.entries())
        .map(([label, values]) => ({
            label,
            mean: mean(values),
            n: values.length,
            sd: sampleStdDev(values),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const droppedRows = missingOutcome + missingGroup;

    return {
        groups,
        missing: {
            dropRate: rows.length > 0 ? droppedRows / rows.length : 0,
            droppedRows,
            missingGroupRows: missingGroup,
            missingOutcomeRows: missingOutcome,
            totalRows: rows.length,
        },
    };
};

const mean = (xs: ReadonlyArray<number>): number =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sample standard deviation (n−1 denominator, Bessel's correction). */
const sampleStdDev = (xs: ReadonlyArray<number>): number => {
    if (xs.length < 2) {
        return 0;
    }
    const m = mean(xs);
    const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);

    return Math.sqrt(variance);
};
