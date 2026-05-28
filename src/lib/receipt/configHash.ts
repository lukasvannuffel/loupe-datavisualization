import type { ChartSpec } from "@/lib/chartSpec/types";

const canonicalize = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(",")}]`;
    }

    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`);

    return `{${entries.join(",")}}`;
};

export const computeConfigHash = async (chartSpec: ChartSpec): Promise<string> => {
    const canonical = canonicalize(chartSpec);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    const fullHash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

    return `sha256·${fullHash.slice(0, 6)}…${fullHash.slice(-4)}`;
};
