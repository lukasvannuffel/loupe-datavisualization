import { describe, expect, it } from "vitest";

import { canonicalize } from "../canonicalize";

describe("canonicalize", () => {
    it("ignores object key insertion order at the root", () => {
        expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
    });

    it("sorts keys at every nesting level", () => {
        expect(canonicalize({ outer: { a: 1, b: 2 } })).toBe(canonicalize({ outer: { b: 2, a: 1 } }));
    });

    it("preserves array element order", () => {
        expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
    });

    it("serializes primitives and null stably", () => {
        expect(canonicalize(null)).toBe("null");
        expect(canonicalize(true)).toBe("true");
        expect(canonicalize(42)).toBe("42");
        expect(canonicalize("x")).toBe('"x"');
    });
});
