import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { MAX_GROUPS } from "@/lib/chartSpec/constants";

import { parseNumericCell } from "./barError";
import { computeLinearRegression } from "./linearRegression";
import type { LabeledRegression, XYGroup, XYPlotData, XYPoint } from "./xyPlot.types";
import { XYPlotError } from "./xyPlot.types";

const DEFAULT_GROUP = "All";

export const aggregateXYPlot = (
    rows: PrivateRows,
    mapping: Mapping,
    options: { readonly computeRegression: boolean },
): XYPlotData => {
    const xKey = mapping.x;
    const yKey = mapping.y;
    if (xKey === undefined || yKey === undefined) {
        throw new XYPlotError("No valid (x, y) pairs found.");
    }

    const groupKey = mapping.group;
    const buckets = new Map<string, XYPoint[]>();

    for (const row of rows) {
        const xRaw = row[xKey]?.trim() ?? "";
        const yRaw = row[yKey]?.trim() ?? "";
        const x = xRaw.length === 0 ? NaN : parseNumericCell(xRaw);
        const y = yRaw.length === 0 ? NaN : parseNumericCell(yRaw);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
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
        bucket.push({ x, y });
        buckets.set(label, bucket);
    }

    if (buckets.size === 0) {
        throw new XYPlotError("No valid (x, y) pairs found.");
    }

    if (buckets.size > MAX_GROUPS) {
        throw new XYPlotError(`Max ${MAX_GROUPS} groups supported. Received ${buckets.size}.`);
    }

    const regressions: LabeledRegression[] = [];
    let regressionSkipped = false;
    const groups: XYGroup[] = [];

    for (const [label, rawPoints] of buckets) {
        // XYGroup.points contains paired (x, y) observations as bare numbers.
        // In a clinical scatter (e.g., biomarker vs. age), the (x, y) pair alone is
        // not directly re-identifying, but extreme outlier pairs may be — same
        // trade-off as box plot outliers. Do NOT add patientId, subjectId, rowIndex,
        // or other joinable fields. Bare numbers only.
        const points = [...rawPoints].sort((a, b) => a.x - b.x);
        groups.push({ label, points });

        if (options.computeRegression) {
            const fit = computeLinearRegression(points);
            if (fit === null) {
                regressionSkipped = true;
            }
            else {
                regressions.push({ label, ...fit });
            }
        }
    }

    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const group of groups) {
        for (const p of group.points) {
            xMin = Math.min(xMin, p.x);
            xMax = Math.max(xMax, p.x);
            yMin = Math.min(yMin, p.y);
            yMax = Math.max(yMax, p.y);
        }
    }

    return {
        kind: "xy",
        groups,
        regressions,
        regressionSkipped,
        xMin,
        xMax,
        yMin,
        yMax,
    };
};
