// @vitest-environment happy-dom

import { select } from "d3-selection";
import { afterEach, describe, expect, it } from "vitest";

import { applyDesignTokens, readDesignTokens } from "../applyDesignTokens";

describe("readDesignTokens", () => {
    afterEach(() => {
        document.documentElement.removeAttribute("style");
    });

    it("returns fallbacks when document is unavailable", () => {
        const doc = globalThis.document;
        // @ts-expect-error — simulate SSR
        globalThis.document = undefined;

        const tokens = readDesignTokens();
        expect(tokens.ink).toBe("#0E0E0E");
        expect(tokens.paper).toBe("#FAFAF7");

        globalThis.document = doc;
    });

    it("reads CSS custom properties when set", () => {
        document.documentElement.style.setProperty("--ink", "#111111");
        document.documentElement.style.setProperty("--paper", "#eeeeee");
        document.documentElement.style.setProperty("--hairline", "#cccccc");
        document.documentElement.style.setProperty("--amber", "#ff9900");
        document.documentElement.style.setProperty("--gray", "#888888");

        const tokens = readDesignTokens();
        expect(tokens.ink).toBe("#111111");
        expect(tokens.paper).toBe("#eeeeee");
        expect(tokens.hairline).toBe("#cccccc");
        expect(tokens.amber).toBe("#ff9900");
        expect(tokens.muted).toBe("#888888");
    });

    it("falls back per token when a custom property is empty", () => {
        document.documentElement.style.setProperty("--ink", "   ");

        const tokens = readDesignTokens();
        expect(tokens.ink).toBe("#0E0E0E");
    });
});

describe("applyDesignTokens", () => {
    it("applies ink color and mono font on the svg selection", () => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const sel = select(svg);
        const tokens = readDesignTokens();

        applyDesignTokens(sel, tokens);

        expect(svg.style.color).toBe(tokens.ink);
        expect(svg.style.fontSize).toBe("11px");
    });
});
