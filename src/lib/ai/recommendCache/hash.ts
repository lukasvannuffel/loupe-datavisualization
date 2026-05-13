import type { ContentHash } from "./cache.types";

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Narrows a validated 64-char lowercase hex string to `ContentHash` (single choke-point for the brand).
 */
export const toContentHash = (hex: string): ContentHash => {
    if (!HEX64.test(hex)) {
        throw new Error("ContentHash must be 64 lowercase hex characters");
    }

    return hex as ContentHash;
};

/**
 * SHA-256 hash via Web Crypto. Returns lowercase hex.
 *
 * Web Crypto is available in modern browsers (the client side where this runs).
 * Server-side (Next.js server actions) also has it via globalThis.crypto.subtle.
 */
export const sha256 = async (input: string): Promise<ContentHash> => {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return toContentHash(hex);
};
