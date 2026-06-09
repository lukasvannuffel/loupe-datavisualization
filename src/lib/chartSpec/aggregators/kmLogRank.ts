import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { parseNumericCell } from "./barError";
import { chi2pValue } from "./chi2pValue";

export type LogRankResult = { readonly chi2: number; readonly df: number; readonly pValue: number };
type Row = { readonly time: number; readonly event: 0 | 1 };

/** Mantel–Cox log-rank; null when <2 groups or any group has <2 events. */
export function computeKmLogRank(rows: PrivateRows, mapping: Mapping): LogRankResult | null {
    const tk = mapping.time;
    const ek = mapping.event;
    const gk = mapping.group;

    if (tk === undefined || ek === undefined) {
        return null;
    }

    const buckets = new Map<string, Row[]>();

    for (const row of rows) {
        const ev = row[ek]?.trim();
        const time = parseNumericCell(row[tk]?.trim() ?? "");
        const event = ev === "1" ? 1 : ev === "0" ? 0 : null;
        const group = gk === undefined ? "All" : row[gk]?.trim() || null;

        if (!Number.isFinite(time) || time < 0 || event === null || group === null) {
            continue;
        }

        (buckets.get(group) ?? buckets.set(group, []).get(group)!).push({ event, time });
    }

    if (buckets.size < 2) {
        return null;
    }

    const groups = [...buckets.entries()];

    if (groups.some(([, rs]) => rs.filter((r) => r.event).length < 2)) {
        return null;
    }

    const labels = groups.map(([g]) => g);
    const O = Object.fromEntries(labels.map((g) => [g, 0])) as Record<string, number>;
    const E = { ...O };
    const times = [...new Set(groups.flatMap(([, rs]) => rs.filter((r) => r.event).map((r) => r.time)))].sort(
        (a, b) => a - b,
    );

    for (const t of times) {
        let N = 0;
        let D = 0;
        const n: Record<string, number> = {};
        const d: Record<string, number> = {};

        for (const [g, rs] of groups) {
            n[g] = rs.filter((r) => r.time >= t).length;
            d[g] = rs.filter((r) => r.time === t && r.event).length;
            N += n[g]!;
            D += d[g]!;
        }

        for (const g of labels) {
            O[g]! += d[g]!;
            E[g]! += N > 0 ? (n[g]! * D) / N : 0;
        }
    }

    const chi2 = labels.reduce((s, g) => s + (E[g]! > 0 ? (O[g]! - E[g]!) ** 2 / E[g]! : 0), 0);

    return { chi2, df: labels.length - 1, pValue: chi2pValue(chi2, labels.length - 1) };
}
