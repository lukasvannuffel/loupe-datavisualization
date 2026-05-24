import { ticks } from "d3-array";
import { scaleLinear } from "d3-scale";

import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { parseNumericCell } from "./barError";
import { kmPointCI } from "./greenwood";
import type { KMGroup, KMPlotData, KMPoint } from "./kaplanMeier.types";
import { KaplanMeierError } from "./kaplanMeier.types";

import { MAX_GROUPS } from "@/lib/chartSpec/constants";
const DEFAULT_GROUP = "All";

type RawRow = { readonly time: number; readonly event: 0 | 1 };

const parseEvent = (raw: string): 0 | 1 | null => {
    const t = raw.trim();
    if (t === "0") {
        return 0;
    }
    if (t === "1") {
        return 1;
    }

    return null;
};

const computeKMGroup = (
    rows: readonly RawRow[],
    label: string,
    tickTimes: readonly number[],
): KMGroup => {
    const sorted = [...rows].sort((a, b) => a.time - b.time);
    const points: KMPoint[] = [];
    let survival = 1;
    let cumGreenwoodSum = 0;
    let nAtRisk = sorted.length;
    let nEvents = 0;
    let index = 0;

    while (index < sorted.length) {
        const t = sorted[index]?.time as number;
        let d = 0;
        let c = 0;
        while (index < sorted.length && sorted[index]?.time === t) {
            const row = sorted[index] as RawRow;
            if (row.event === 1) {
                d++;
            }
            else {
                c++;
            }
            index++;
        }
        if (d > 0) {
            survival *= 1 - d / nAtRisk;
            cumGreenwoodSum += d / (nAtRisk * (nAtRisk - d));
            nEvents += d;
        }
        const ci = kmPointCI(survival, cumGreenwoodSum);
        points.push({
            censored: d === 0,
            ciLower: ci.lower,
            ciUpper: ci.upper,
            nAtRisk,
            survival,
            t,
        });
        nAtRisk -= d + c;
    }

    return {
        atRiskTicks: tickTimes.map((t) => ({
            nAtRisk: sorted.filter((r) => r.time >= t).length,
            t,
        })),
        label,
        nEvents,
        nTotal: sorted.length,
        points,
    };
};

export const aggregateKaplanMeier = (rows: PrivateRows, mapping: Mapping): KMPlotData => {
    const timeKey = mapping.time;
    const eventKey = mapping.event;
    if (timeKey === undefined || eventKey === undefined) {
        throw new KaplanMeierError("No valid rows.");
    }

    const groupKey = mapping.group;
    const buckets = new Map<string, RawRow[]>();

    for (const row of rows) {
        const timeRaw = row[timeKey]?.trim() ?? "";
        const eventRaw = row[eventKey]?.trim() ?? "";
        const time = timeRaw.length === 0 ? NaN : parseNumericCell(timeRaw);
        const event = parseEvent(eventRaw);
        if (!Number.isFinite(time) || time < 0 || event === null) {
            continue;
        }
        const groupLabel =
            groupKey === undefined
                ? DEFAULT_GROUP
                : (row[groupKey]?.trim() ?? "").length === 0
                  ? null
                  : (row[groupKey]?.trim() as string);
        if (groupLabel === null) {
            continue;
        }
        const bucket = buckets.get(groupLabel) ?? [];
        bucket.push({ event, time });
        buckets.set(groupLabel, bucket);
    }

    if (buckets.size > MAX_GROUPS) {
        throw new KaplanMeierError(`Max 4 groups supported. Received ${buckets.size}.`);
    }

    let rawMax = 0;
    for (const groupRows of buckets.values()) {
        for (const row of groupRows) {
            rawMax = Math.max(rawMax, row.time);
        }
    }
    const tMax = rawMax <= 0 ? 1 : (scaleLinear().domain([0, rawMax]).nice().domain()[1] as number);
    const tickTimes = ticks(0, tMax, 6);
    const groups: KMGroup[] = [];
    for (const [label, groupRows] of buckets) {
        if (groupRows.length > 0) {
            groups.push(computeKMGroup(groupRows, label, tickTimes));
        }
    }
    if (groups.length === 0) {
        throw new KaplanMeierError("No valid rows.");
    }
    return { groups, kind: "km", tMax };
};
