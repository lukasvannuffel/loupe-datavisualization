import type { ChartSpec } from "@/lib/chartSpec/types";

import type { ComputationSummary } from "./composeReceipt";

const sortedReplacer = (_key: string, value: unknown): unknown => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort());
    }

    return value;
};

const bufferToHex = (buffer: ArrayBuffer): string =>
    Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

export async function hashSpecAndComputations(
    spec: ChartSpec,
    computations: ComputationSummary,
): Promise<string> {
    const payload = { spec, computations };
    const serialized = JSON.stringify(payload, sortedReplacer);
    const encoded = new TextEncoder().encode(serialized);
    const digest = await crypto.subtle.digest("SHA-256", encoded);

    return bufferToHex(digest);
}
