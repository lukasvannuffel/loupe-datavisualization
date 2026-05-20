// @vitest-environment happy-dom

import { scaleBand, scaleLinear } from "d3-scale";
import { describe, expect, it } from "vitest";

import { readDesignTokens } from "../applyDesignTokens";
import { applyAxes, axisTickCountForWidth } from "../applyAxes";
import { DEFAULT_MARGIN } from "../chart.types";

const makeCtx = (width: number, height: number) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    const margin = DEFAULT_MARGIN;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    return {
        svg,
        dimensions: { width, height },
        margin,
        innerWidth,
        innerHeight,
    };
};

describe("applyAxes", () => {
    it("appends x-axis and y-axis groups", () => {
        const ctx = makeCtx(600, 400);
        const xScale = scaleBand<string>().domain(["A", "B"]).range([0, ctx.innerWidth]);
        const yScale = scaleLinear().domain([0, 10]).range([ctx.innerHeight, 0]);
        const tokens = readDesignTokens();

        applyAxes(ctx, xScale, yScale, tokens);

        expect(ctx.svg.querySelector("g.x-axis")).not.toBeNull();
        expect(ctx.svg.querySelector("g.y-axis")).not.toBeNull();
    });

    it("uses fewer y ticks on narrow viewports", () => {
        expect(axisTickCountForWidth(400)).toBe(4);
        expect(axisTickCountForWidth(480)).toBe(6);
        expect(axisTickCountForWidth(800)).toBe(6);
    });
});
