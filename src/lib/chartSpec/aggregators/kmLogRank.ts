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
    const groupRows = groups.map(([, rs]) => rs);
    const k = labels.length;
    const times = [
        ...new Set(groupRows.flatMap((rs) => rs.filter((r) => r.event).map((r) => r.time))),
    ].sort((a, b) => a - b);

    if (k === 2) {
        const [r0, r1] = groupRows;
        let u = 0;
        let variance = 0;

        for (const t of times) {
            const n0 = r0!.filter((r) => r.time >= t).length;
            const n1 = r1!.filter((r) => r.time >= t).length;
            const d0 = r0!.filter((r) => r.time === t && r.event).length;
            const d1 = r1!.filter((r) => r.time === t && r.event).length;
            const n = n0 + n1;
            const d = d0 + d1;

            if (n <= 1 || d === 0) {
                continue;
            }

            u += d0 - (n0 * d) / n;
            variance += (n0 * n1 * d * (n - d)) / (n * n * (n - 1));
        }

        const chi2 = variance > 0 ? (u * u) / variance : 0;

        return { chi2, df: 1, pValue: chi2pValue(chi2, 1) };
    }

    const m = k - 1;
    const observed = Array.from({ length: m }, () => 0);
    const expected = Array.from({ length: m }, () => 0);
    const variance = Array.from({ length: m }, () => Array.from({ length: m }, () => 0));

    for (const t of times) {
        const atRisk = groupRows.map((rs) => rs.filter((r) => r.time >= t).length);
        const deaths = groupRows.map((rs) => rs.filter((r) => r.time === t && r.event).length);
        const n = atRisk.reduce((sum, count) => sum + count, 0);
        const d = deaths.reduce((sum, count) => sum + count, 0);

        if (n === 0 || d === 0) {
            continue;
        }

        for (let j = 0; j < m; j++) {
            observed[j] = (observed[j] ?? 0) + (deaths[j] ?? 0);
            expected[j] = (expected[j] ?? 0) + ((atRisk[j] ?? 0) * d) / n;
        }

        if (n <= 1) {
            continue;
        }

        const factor = (d * (n - d)) / (n * n * (n - 1));

        for (let j = 0; j < m; j++) {
            variance[j]![j] = (variance[j]![j] ?? 0) + (atRisk[j] ?? 0) * (n - (atRisk[j] ?? 0)) * factor;

            for (let l = j + 1; l < m; l++) {
                const cov = (atRisk[j] ?? 0) * (atRisk[l] ?? 0) * factor;
                variance[j]![l] = (variance[j]![l] ?? 0) - cov;
                variance[l]![j] = (variance[l]![j] ?? 0) - cov;
            }
        }
    }

    const diff = observed.map((o, j) => o - (expected[j] ?? 0));
    const chi2 = quadraticForm(diff, variance);

    return { chi2, df: m, pValue: chi2pValue(chi2, m) };
}

const quadraticForm = (vector: readonly number[], matrix: readonly (readonly number[])[]): number => {
    const inverse = invertMatrix(matrix);

    if (inverse === null) {
        return 0;
    }

    let sum = 0;

    for (let j = 0; j < vector.length; j++) {
        for (let l = 0; l < vector.length; l++) {
            sum += (vector[j] ?? 0) * (inverse[j]?.[l] ?? 0) * (vector[l] ?? 0);
        }
    }

    return sum;
};

const invertMatrix = (matrix: readonly (readonly number[])[]): number[][] | null => {
    const n = matrix.length;

    if (n === 0) {
        return null;
    }

    const augmented = matrix.map((row, i) => [
        ...row.map((value) => value),
        ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    ]);

    for (let col = 0; col < n; col++) {
        let pivot = col;

        for (let row = col + 1; row < n; row++) {
            if (Math.abs(augmented[row]![col] ?? 0) > Math.abs(augmented[pivot]![col] ?? 0)) {
                pivot = row;
            }
        }

        const pivotRow = augmented[pivot];
        const pivotValue = pivotRow?.[col] ?? 0;

        if (Math.abs(pivotValue) < 1e-12) {
            return null;
        }

        if (pivot !== col) {
            const swap = augmented[col]!;
            augmented[col] = augmented[pivot]!;
            augmented[pivot] = swap;
        }

        const scale = 1 / pivotValue;
        const current = augmented[col]!;

        for (let j = 0; j < 2 * n; j++) {
            current[j] = (current[j] ?? 0) * scale;
        }

        for (let row = 0; row < n; row++) {
            if (row === col) {
                continue;
            }

            const factor = augmented[row]![col] ?? 0;

            if (factor === 0) {
                continue;
            }

            for (let j = 0; j < 2 * n; j++) {
                augmented[row]![j] = (augmented[row]![j] ?? 0) - factor * (current[j] ?? 0);
            }
        }
    }

    return augmented.map((row) => row.slice(n, 2 * n));
};
