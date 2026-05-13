import { describe, expect, it } from "vitest";

import { canonicalize } from "../canonicalize";

/**
 * Unsorted key traversal — if production `canonicalize` dropped `.sort()`, these
 * two permutations would **not** stringify the same and cache keys would diverge.
 */
const canonicalizeWithoutKeySort = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalizeWithoutKeySort).join(",")}]`;
    }
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeWithoutKeySort(obj[k])}`);

    return `{${parts.join(",")}}`;
};

describe("canonicalize key-order contract", () => {
    it("unsorted serialization diverges for key permutations; production canonicalize matches", () => {
        const permutedA = { z: 1, y: 2, x: 3 };
        const permutedB = { x: 3, y: 2, z: 1 };
        expect(canonicalizeWithoutKeySort(permutedA)).not.toBe(canonicalizeWithoutKeySort(permutedB));
        expect(canonicalize(permutedA)).toBe(canonicalize(permutedB));
    });
});
