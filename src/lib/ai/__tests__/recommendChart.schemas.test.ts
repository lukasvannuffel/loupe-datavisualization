import { describe, expect, it } from "vitest";

import { containsForbiddenKeyDeep } from "../recommendChart.schemas";

describe("containsForbiddenKeyDeep", () => {
    it("walks nested objects for forbidden key names", () => {
        expect(
            containsForbiddenKeyDeep({
                meta: { sampleValues: ["leak"] },
            }),
        ).toBe(true);
    });

    it("returns false for plain MVP-shaped payloads", () => {
        expect(
            containsForbiddenKeyDeep({
                columns: [{ name: "t", nullCount: 0, primaryType: "numeric", uniqueCount: 1 }],
                intent: "x",
                mapping: { time: "t" },
            }),
        ).toBe(false);
    });
});
