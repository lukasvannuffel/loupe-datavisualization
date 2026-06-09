import type { Selection } from "d3-selection";

import type { StatTest } from "@/lib/chartSpec/types";

import type { DesignTokens } from "./applyDesignTokens";

export const KM_STAT_PLACEHOLDER_LINES = [
    "HR 0.74 (95% CI 0.61–0.89)",
    "log-rank p < 0.001",
] as const;

const LINE_HEIGHT_PX = 14;
const TOP_OFFSET_PX = 12;
const RIGHT_OFFSET_PX = 4;

const COMPACT_STAT_PATTERN =
    /\b(HR|hazard ratio|log[-\s]?rank|cox)\b.*\d|\bp\s*[<=>]\s*[\d.]+|\d+\.?\d*\s*\(95%\s*CI/i;

const METHODOLOGY_PATTERN =
    /\b(comparing|estimation|between treatment|for each group|survival curves between)\b/i;

const formatPValue = (pValue: number): string =>
    pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`;

const labelLooksLikeStatResult = (label: string): boolean => {
    const trimmed = label.trim();

    if (trimmed.length === 0) {
        return false;
    }

    if (COMPACT_STAT_PATTERN.test(trimmed)) {
        return true;
    }

    if (METHODOLOGY_PATTERN.test(trimmed) && !/\bp\s*[<=>]/i.test(trimmed)) {
        return false;
    }

    if (trimmed.length > 55 && !/\d/.test(trimmed)) {
        return false;
    }

    if (trimmed.length > 80 && !COMPACT_STAT_PATTERN.test(trimmed)) {
        return false;
    }

    return false;
};

const formatStatTest = (test: StatTest): string | null => {
    const context = `${test.name ?? ""} ${test.label}`;

    if (test.statistic !== undefined && test.ci95 !== undefined) {
        const prefix = /cox|hazard|hr/i.test(context) ? "HR" : "Estimate";

        return `${prefix} ${test.statistic.toFixed(2)} (95% CI ${test.ci95[0].toFixed(2)}–${test.ci95[1].toFixed(2)})`;
    }

    if (test.pValue !== undefined) {
        const pText = formatPValue(test.pValue);

        if (/log[-\s]?rank/i.test(context)) {
            return `log-rank ${pText}`;
        }

        if (labelLooksLikeStatResult(test.label)) {
            return `${test.label} (${pText})`;
        }

        return `log-rank ${pText}`;
    }

    if (labelLooksLikeStatResult(test.label)) {
        return test.label;
    }

    return null;
};

export const resolveKmStatLines = (tests?: readonly StatTest[]): readonly string[] => {
    if (tests === undefined || tests.length === 0) {
        return KM_STAT_PLACEHOLDER_LINES;
    }

    const lines = tests
        .map(formatStatTest)
        .filter((line): line is string => line !== null);

    if (lines.length === 0) {
        return KM_STAT_PLACEHOLDER_LINES;
    }

    return lines.slice(0, 2);
};

export const drawKmStatAnnotation = (
    plotG: Selection<SVGGElement, unknown, null, undefined>,
    innerWidth: number,
    tokens: DesignTokens,
    lines: readonly string[],
): void => {
    const annotationG = plotG
        .append("g")
        .attr("class", "km-stats")
        .attr("data-role", "km-stats");

    lines.forEach((line, index) => {
        annotationG
            .append("text")
            .attr("data-role", "km-stat-line")
            .attr("x", innerWidth - RIGHT_OFFSET_PX)
            .attr("y", TOP_OFFSET_PX + index * LINE_HEIGHT_PX)
            .attr("text-anchor", "end")
            .attr("fill", tokens.muted)
            .attr("font-size", "10.5px")
            .text(line);
    });
};
