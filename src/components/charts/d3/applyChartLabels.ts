import { select } from "d3-selection";

import type { ResolvedChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";

import type { DesignTokens } from "./applyDesignTokens";
import type { ChartDrawContext, Margin } from "./chart.types";

export const LABEL_MARGIN_EXTRA = {
    top: 32,
    left: 32,
    bottom: 24,
} as const;

export const marginWithLabels = (base: Margin): Margin => ({
    top: base.top + LABEL_MARGIN_EXTRA.top,
    right: base.right,
    bottom: base.bottom + LABEL_MARGIN_EXTRA.bottom,
    left: base.left + LABEL_MARGIN_EXTRA.left,
});

type ApplyChartLabelsArgs = {
    readonly ctx: ChartDrawContext;
    readonly labels: ResolvedChartLabels;
    readonly tokens: DesignTokens;
    readonly extraBottomPx: number;
};

export const applyChartLabels = ({
    ctx,
    labels,
    tokens,
    extraBottomPx,
}: ApplyChartLabelsArgs): void => {
    const svg = select(ctx.svg);

    if (labels.title.length > 0) {
        svg.append("text")
            .attr("data-role", "chart-title")
            .attr("x", ctx.dimensions.width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("fill", tokens.ink)
            .style("font-family", 'var(--font-serif, "Source Serif 4", Georgia, serif)')
            .style("font-size", "14px")
            .text(labels.title);
    }

    if (labels.xLabel.length > 0) {
        const xY = ctx.margin.top + ctx.innerHeight + extraBottomPx + 18;
        svg.append("text")
            .attr("data-role", "axis-label-x")
            .attr("x", ctx.margin.left + ctx.innerWidth / 2)
            .attr("y", xY)
            .attr("text-anchor", "middle")
            .attr("fill", tokens.ink)
            .style("font-family", "var(--font-mono, ui-monospace)")
            .style("font-size", "11px")
            .text(labels.xLabel);
    }

    if (labels.yLabel.length > 0) {
        const yX = 16;
        const yY = ctx.margin.top + ctx.innerHeight / 2;
        svg.append("text")
            .attr("data-role", "axis-label-y")
            .attr("x", yX)
            .attr("y", yY)
            .attr("text-anchor", "middle")
            .attr("fill", tokens.ink)
            .attr("transform", `rotate(-90 ${yX} ${yY})`)
            .style("font-family", "var(--font-mono, ui-monospace)")
            .style("font-size", "11px")
            .text(labels.yLabel);
    }
};
