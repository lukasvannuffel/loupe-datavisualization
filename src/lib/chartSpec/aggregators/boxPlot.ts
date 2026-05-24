import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { MAX_GROUPS } from "@/lib/chartSpec/constants";
import { parseNumericCell } from "./barError";
import type { BoxPlotData, BoxStats, GroupStats } from "./boxPlot.types";
import { BoxPlotError } from "./boxPlot.types";
import { percentileType7 } from "./quantileType7";

const MIN_N_FOR_BOX = 5;
const NOTCH_FACTOR = 1.57;
const DEFAULT_GROUP = "All";

const computeBoxStats = (label: string, values: readonly number[]): BoxStats => {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = percentileType7(sorted, 0.25);
    const median = percentileType7(sorted, 0.5);
    const q3 = percentileType7(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    // outliers array contains raw values, NOT indices or row IDs. This is the
    // publication standard (a box plot's outlier dot at y=350 requires the
    // value 350 to render). In clinical data, extreme outlier values can be
    // re-identifying — this is a known trade-off, not a bug. Do NOT add row
    // IDs, patient keys, or other joinable fields. The values alone are not
    // re-identifiable without external context.
    const outliers = sorted.filter((value) => value < lowerFence || value > upperFence);
    const nonOutliers = sorted.filter((value) => value >= lowerFence && value <= upperFence);
    const whiskerMin = nonOutliers[0] ?? median;
    const whiskerMax = nonOutliers[nonOutliers.length - 1] ?? median;
    const notchHalfWidth = (NOTCH_FACTOR * iqr) / Math.sqrt(n);

    return {
        kind: "box",
        label,
        n,
        min: whiskerMin,
        q1,
        median,
        q3,
        max: whiskerMax,
        mean: sorted.reduce((sum, value) => sum + value, 0) / n,
        outliers,
        notchLower: median - notchHalfWidth,
        notchUpper: median + notchHalfWidth,
    };
};

export const aggregateBoxPlot = (rows: PrivateRows, mapping: Mapping): BoxPlotData => {
    const valueKey = mapping.outcome;
    const groupKey = mapping.group;

    if (valueKey === undefined) {
        throw new BoxPlotError("No valid rows.");
    }

    const buckets = new Map<string, number[]>();

    for (const row of rows) {
        const valueRaw = row[valueKey]?.trim() ?? "";
        const value = valueRaw.length === 0 ? NaN : parseNumericCell(valueRaw);
        if (!Number.isFinite(value)) {
            continue;
        }

        let label: string | null;
        if (groupKey === undefined) {
            label = DEFAULT_GROUP;
        }
        else {
            const groupTrimmed = row[groupKey]?.trim() ?? "";
            label = groupTrimmed.length === 0 ? null : groupTrimmed;
        }
        if (label === null) {
            continue;
        }

        const bucket = buckets.get(label) ?? [];
        bucket.push(value);
        buckets.set(label, bucket);
    }

    if (buckets.size === 0) {
        throw new BoxPlotError(
            "No valid numeric values found in the selected column. Check that the outcome column contains numbers.",
        );
    }

    if (buckets.size > MAX_GROUPS) {
        throw new BoxPlotError(`Max ${MAX_GROUPS} groups supported. Received ${buckets.size}.`);
    }

    const groups: GroupStats[] = [];

    for (const [label, values] of buckets) {
        // Defensive: cannot occur in normal flow because empty buckets are not created
        // during bucketing (LOUPE-13 post-review Fix 3). Retained as a guard against
        // future refactors that might bypass the validity check.
        if (values.length === 0) {
            throw new BoxPlotError(`Group "${label}" has no valid numeric values.`);
        }
        if (values.length < MIN_N_FOR_BOX) {
            // Strip plot mode publishes raw values for groups with n < 5. Same trade-off
            // as the outliers array above. Bare numeric values only; no row IDs.
            groups.push({ kind: "strip", label, n: values.length, values });
        }
        else {
            groups.push(computeBoxStats(label, values));
        }
    }

    const allY = groups.flatMap((group) =>
        group.kind === "strip" ? group.values : [group.min, group.max, ...group.outliers],
    );

    return {
        kind: "box",
        groups,
        yMin: Math.min(...allY),
        yMax: Math.max(...allY),
    };
};
