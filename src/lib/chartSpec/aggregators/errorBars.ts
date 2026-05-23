import type { Receipt } from "@/lib/chartSpec/types";

import type { ErrorBarType, GroupStats } from "./barError.types";
import { tCritical } from "./tCritical";

/** First matching hint wins: ci95 → sem → sd (per test row, top to bottom). */
const ERROR_TYPE_HINTS: ReadonlyArray<readonly [RegExp, ErrorBarType]> = [
    [/\b(95\s?%?\s?ci|confidence)/i, "ci95"],
    [/\b(sem|standard error)/i, "sem"],
    [/\b(sd|standard deviation)/i, "sd"],
];

/** True when this group has enough data to draw any error bar. */
export const canDrawErrorBars = (group: GroupStats): boolean =>
    group.n >= 2 && Number.isFinite(group.sd) && group.sd > 0;

/**
 * Error bar half-width for one group. Returns 0 when n&lt;2 (insufficient variance).
 * CI95 uses Student's t: t(0.975, n-1) × SD/√n.
 */
export const computeErrorBar = (group: GroupStats, type: ErrorBarType): number => {
    if (group.n < 2 || !Number.isFinite(group.sd)) {
        return 0;
    }
    switch (type) {
        case "sd":
            return group.sd;
        case "sem":
            return group.sd / Math.sqrt(group.n);
        case "ci95":
            return tCritical(group.n - 1) * (group.sd / Math.sqrt(group.n));
    }
};

export const inferErrorTypeFromReceipt = (receipt: Receipt): ErrorBarType => {
    for (const test of receipt.tests) {
        const haystack = `${test.label} ${test.name ?? ""}`;
        for (const [regex, type] of ERROR_TYPE_HINTS) {
            if (regex.test(haystack)) {
                return type;
            }
        }
    }

    return "sem";
};
