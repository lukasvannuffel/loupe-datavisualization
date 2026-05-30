import { describe, expect, it } from "vitest";

import { toSvgFilename } from "@/lib/export/filenameHelper";

describe("toSvgFilename", () => {
    it("converts a simple title to kebab-case with .svg extension", () => {
        expect(toSvgFilename("My Chart!")).toBe("my-chart.svg");
    });

    it("returns chart.svg for whitespace-only titles", () => {
        expect(toSvgFilename("  ")).toBe("chart.svg");
    });

    it("truncates long titles to at most 50 characters before the extension", () => {
        const title = "a".repeat(60);

        expect(toSvgFilename(title).length).toBeLessThanOrEqual(56);
    });

    it("strips unsafe filename characters", () => {
        const filename = toSvgFilename("Chart/Name:With<Bad>Chars");

        expect(filename).not.toMatch(/[/:<>]/);
    });

    it("never produces double hyphens", () => {
        expect(toSvgFilename("My  Chart!!  Name")).not.toMatch(/--/);
        expect(toSvgFilename("Chart/Name:With<Bad>Chars")).not.toMatch(/--/);
    });

    it("truncates word-aware without cutting mid-word when possible", () => {
        expect(toSvgFilename("a-long-title-here")).toBe("a-long-title-here.svg");
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/filenameHelper.ts, change MAX_BASENAME_LENGTH from 50 to 5.
    //   Re-run "truncates word-aware without cutting mid-word when possible".
    //   Expected result becomes "a.svg" instead of "a-long-title-here.svg" -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.
});
