// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { LogRankResult } from "@/lib/chartSpec/aggregators/kmLogRank";

import { resolveKmStatLines } from "../kmStatsAnnotation";

const StatLinesPreview = ({
    logRank,
}: {
    readonly logRank: LogRankResult | null;
}): JSX.Element => {
    const lines = resolveKmStatLines(logRank);

    if (lines.length === 0) {
        return <div />;
    }

    return (
        <div>
            {lines.map((line) => (
                <span key={line}>{line}</span>
            ))}
        </div>
    );
};

describe("resolveKmStatLines", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders log-rank p = 0.042 from LogRankResult", () => {
        render(<StatLinesPreview logRank={{ chi2: 4.2, df: 1, pValue: 0.042 }} />);

        expect(screen.getByText("log-rank p = 0.042")).toBeTruthy();
    });

    it("renders p < 0.001 from LogRankResult", () => {
        render(<StatLinesPreview logRank={{ chi2: 12, df: 1, pValue: 0.0005 }} />);

        expect(screen.getByText("log-rank p < 0.001")).toBeTruthy();
    });

    it("renders nothing when passed null", () => {
        render(<StatLinesPreview logRank={null} />);

        expect(screen.queryByText(/log-rank/)).toBeNull();
    });
});
