"use client";

import type { GroupStats } from "@/lib/chartSpec/aggregators/barError.types";
import { canDrawErrorBars } from "@/lib/chartSpec/aggregators/errorBars";

type Props = { readonly groups: ReadonlyArray<GroupStats> };

export const ErrorBarsUnavailable = ({ groups }: Props): JSX.Element | null => {
    if (groups.length === 0) {
        return null;
    }

    const maxN = groups.reduce((max, g) => (g.n > max ? g.n : max), 0);
    const anyDrawable = groups.some((g) => canDrawErrorBars(g));

    if (anyDrawable) {
        return null;
    }

    const nSummary = groups.map((g) => `${g.label} n=${g.n}`).join(" · ");

    return (
        <div className="rec-error-unavailable" role="status">
            {maxN < 2 ? (
                <p>
                    <strong>Error bars need at least 2 rows per group.</strong> Each treatment arm in
                    your file currently has only one row, so SD, SEM, and 95% CI are all zero — the
                    toggle will not change the chart until you have replicates per group.
                </p>
            ) : (
                <p>
                    <strong>No spread within groups.</strong> Every group has identical outcome
                    values (SD = 0), so error bars cannot be drawn.
                </p>
            )}
            <p className="muted small mono">{nSummary}</p>
        </div>
    );
};
