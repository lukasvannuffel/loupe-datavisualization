import type { Selection } from "d3-selection";

export type DesignTokens = {
    readonly ink: string;
    readonly paper: string;
    readonly hairline: string;
    readonly amber: string;
    readonly muted: string;
};

const FALLBACK: DesignTokens = {
    ink: "#0E0E0E",
    paper: "#FAFAF7",
    hairline: "#E6E3DA",
    amber: "#B5651D",
    muted: "#6B6B66",
};

export const readDesignTokens = (): DesignTokens => {
    if (typeof document === "undefined") {
        return FALLBACK;
    }

    const styles = getComputedStyle(document.documentElement);
    const get = (name: string, fallback: string): string => {
        const v = styles.getPropertyValue(name).trim();

        return v.length > 0 ? v : fallback;
    };

    return {
        ink: get("--ink", FALLBACK.ink),
        paper: get("--paper", FALLBACK.paper),
        hairline: get("--hairline", FALLBACK.hairline),
        amber: get("--amber", FALLBACK.amber),
        muted: get("--gray", FALLBACK.muted),
    };
};

export const applyDesignTokens = (
    svg: Selection<SVGSVGElement, unknown, null, undefined>,
    tokens: DesignTokens,
): void => {
    svg
        .style("color", tokens.ink)
        .style("font-family", "var(--font-mono, ui-monospace)")
        .style("font-size", "11px");
};
