// @vitest-environment happy-dom

import { scaleBand, scaleLinear } from "d3-scale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const mockBBox = (width: number, height = 12): DOMRect =>
    ({
        width,
        height,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        toJSON: () => ({}),
    }) as DOMRect;

describe("applyAxes", () => {
    let bboxSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeEach(() => {
        bboxSpy = vi
            .spyOn(SVGGraphicsElement.prototype, "getBBox")
            .mockImplementation(() => mockBBox(20));
    });

    afterEach(() => {
        bboxSpy?.mockRestore();
    });

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

    it("rotates x labels when measured widths overflow the axis", () => {
        bboxSpy?.mockImplementation(() => mockBBox(100));
        // innerWidth = 300 - 48 - 16 = 236; 4×100 + 3×8 = 424 > 236
        const ctx = makeCtx(300, 400);
        const labels = ["One", "Two", "Three", "Four"];
        const xScale = scaleBand<string>().domain(labels).range([0, ctx.innerWidth]);
        const yScale = scaleLinear().domain([0, 10]).range([ctx.innerHeight, 0]);
        const tokens = readDesignTokens();

        applyAxes(ctx, xScale, yScale, tokens);

        const transforms = [...ctx.svg.querySelectorAll("g.x-axis text")].map((t) =>
            t.getAttribute("transform"),
        );
        expect(transforms.every((t) => t?.includes("rotate(-35"))).toBe(true);
    });

    it("does not rotate x labels when measured widths fit the axis", () => {
        const ctx = makeCtx(600, 400);
        const labels = ["One", "Two", "Three", "Four"];
        const xScale = scaleBand<string>().domain(labels).range([0, ctx.innerWidth]);
        const yScale = scaleLinear().domain([0, 10]).range([ctx.innerHeight, 0]);
        const tokens = readDesignTokens();

        applyAxes(ctx, xScale, yScale, tokens);

        const transforms = [...ctx.svg.querySelectorAll("g.x-axis text")].map((t) =>
            t.getAttribute("transform"),
        );
        expect(transforms.every((t) => !t?.includes("rotate(-35"))).toBe(true);
    });

    it("returns extraBottomPx when labels are rotated", () => {
        bboxSpy?.mockImplementation(() => mockBBox(100));
        const ctx = makeCtx(300, 400);
        const xScale = scaleBand<string>()
            .domain(["Alpha", "Beta", "Gamma", "Delta"])
            .range([0, ctx.innerWidth]);
        const yScale = scaleLinear().domain([0, 10]).range([ctx.innerHeight, 0]);
        const tokens = readDesignTokens();

        const { extraBottomPx } = applyAxes(ctx, xScale, yScale, tokens);
        expect(extraBottomPx).toBeGreaterThan(0);
    });
});
