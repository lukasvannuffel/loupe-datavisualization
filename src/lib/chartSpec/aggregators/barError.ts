import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import type { BarErrorAggregation, GroupStats, MissingDataInfo } from "./barError.types";

const US_THOUSANDS = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;
const EU_DECIMAL = /^-?\d+,\d{1,2}$/;

/**
 * Coerces a cell string to a finite number.
 * US thousands (`1,234`) vs European decimals (`12,5`) are disambiguated by shape.
 */
export const parseNumericCell = (raw: string): number => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return NaN;
    }
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) {
        return direct;
    }
    if (US_THOUSANDS.test(trimmed)) {
        const us = Number(trimmed.replace(/,/g, ""));
        if (Number.isFinite(us)) {
            return us;
        }
    }
    if (EU_DECIMAL.test(trimmed)) {
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
 * Pure client-side aggregator. Returns per-group {mean, sd, n} and missing-row tallies.
 *
 * Missing rows: each dropped row increments `droppedRows` once. Rows missing both group and
 * outcome increment `missingGroupRows` and `missingOutcomeRows` separately (for diagnostics).
 */
export const aggregateBarError = (rows: PrivateRows, mapping: Mapping): BarErrorAggregation => {
    const groupCol = mapping.group;
    const outcomeCol = mapping.outcome;

    if (groupCol === undefined || outcomeCol === undefined) {
        return { groups: [], missing: EMPTY_MISSING(rows.length) };
    }

    let missingOutcome = 0;
    let missingGroup = 0;
    let droppedRows = 0;
    const buckets = new Map<string, number[]>();

    for (const row of rows) {
        const groupTrimmed = row[groupCol]?.trim() ?? "";
        const outcomeTrimmed = row[outcomeCol]?.trim() ?? "";
        const groupLabel = groupTrimmed.length === 0 ? null : groupTrimmed;
        const outcomeValue =
            outcomeTrimmed.length === 0 ? NaN : parseNumericCell(outcomeTrimmed);

        if (groupLabel === null && !Number.isFinite(outcomeValue)) {
            missingGroup++;
            missingOutcome++;
            droppedRows++;
            continue;
        }
        if (groupLabel === null) {
            missingGroup++;
            droppedRows++;
            continue;
        }
        if (!Number.isFinite(outcomeValue)) {
            missingOutcome++;
            droppedRows++;
            continue;
        }

        const bucket = buckets.get(groupLabel) ?? [];
        bucket.push(outcomeValue);
        buckets.set(groupLabel, bucket);
    }

    const groups: GroupStats[] = Array.from(buckets.entries())
        .map(([label, values]) => {
            const m = mean(values);

            return {
                label,
                mean: m,
                n: values.length,
                sd: sampleStdDev(values, m),
            };
        })
        .sort((a, b) => a.label.localeCompare(b.label));

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
const sampleStdDev = (xs: ReadonlyArray<number>, m: number): number => {
    if (xs.length < 2) {
        return 0;
    }
    const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);

    return Math.sqrt(variance);
};
