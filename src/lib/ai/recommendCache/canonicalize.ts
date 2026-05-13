/**
 * Deterministic JSON serialization. Sorts object keys at every nesting level so that
 * { a: 1, b: 2 } and { b: 2, a: 1 } produce the same string. Necessary for cache-key
 * stability across object-construction-order differences.
 */
export const canonicalize = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(",")}]`;
    }

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);

    return `{${parts.join(",")}}`;
};
