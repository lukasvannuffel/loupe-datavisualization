import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { MAX_GROUPS } from "@/lib/chartSpec/constants";
import { parseNumericCell } from "./barError";
import type { LongitudinalData, LongitudinalGroup, LongitudinalPoint } from "./xyPlot.types";
import { LongitudinalError } from "./xyPlot.types";

const DEFAULT_GROUP = "All";

const sampleSd = (values: readonly number[], mean: number): number => {
    const n = values.length;
    if (n < 2) {
        return 0;
    }

    let sumSq = 0;
    for (const v of values) {
        const d = v - mean;
        sumSq += d * d;
    }

    return Math.sqrt(sumSq / (n - 1));
};

export const aggregateLongitudinal = (rows: PrivateRows, mapping: Mapping): LongitudinalData => {
    const visitKey = mapping.x;
    const valueKey = mapping.y;
    if (visitKey === undefined || valueKey === undefined) {
        throw new LongitudinalError("No valid longitudinal rows found.");
    }

    const groupKey = mapping.group;
    const outer = new Map<string, Map<number, number[]>>();

    for (const row of rows) {
        const visitRaw = row[visitKey]?.trim() ?? "";
        const valueRaw = row[valueKey]?.trim() ?? "";
        const visit = visitRaw.length === 0 ? NaN : parseNumericCell(visitRaw);
        const value = valueRaw.length === 0 ? NaN : parseNumericCell(valueRaw);
        if (!Number.isFinite(visit) || !Number.isFinite(value)) {
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

        const groupMap = outer.get(label) ?? new Map<number, number[]>();
        const visitBucket = groupMap.get(visit) ?? [];
        visitBucket.push(value);
        groupMap.set(visit, visitBucket);
        outer.set(label, groupMap);
    }

    if (outer.size === 0) {
        throw new LongitudinalError("No valid longitudinal rows found.");
    }

    if (outer.size > MAX_GROUPS) {
        throw new LongitudinalError(`Max ${MAX_GROUPS} groups supported. Received ${outer.size}.`);
    }

    const groups: LongitudinalGroup[] = [];
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;

    for (const [label, visitMap] of outer) {
        const points: LongitudinalPoint[] = [];
        const visits = [...visitMap.keys()].sort((a, b) => a - b);

        for (const visit of visits) {
            const values = visitMap.get(visit) ?? [];
            const n = values.length;
            const mean = values.reduce((sum, v) => sum + v, 0) / n;
            const sd = sampleSd(values, mean);
            const sem = n > 1 ? sd / Math.sqrt(n) : 0;

            // LongitudinalPoint contains aggregated stats (mean, sem, n) per visit per
            // group. Individual patient values and identifiers are NOT exposed —
            // aggregation collapses individuals into group statistics at each timepoint.
            // This is Loupe's strongest privacy posture among chart kinds. Do NOT add
            // patientId arrays or per-patient trajectories to this output.
            points.push({ visit, mean, sem, n });

            xMin = Math.min(xMin, visit);
            xMax = Math.max(xMax, visit);
            yMin = Math.min(yMin, mean - sem);
            yMax = Math.max(yMax, mean + sem);
        }

        groups.push({ label, points });
    }

    return { kind: "longitudinal", groups, xMin, xMax, yMin, yMax };
};
