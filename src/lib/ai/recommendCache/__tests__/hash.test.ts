import { describe, expect, it } from "vitest";

import { sha256 } from "../hash";

describe("sha256", () => {
    it("is deterministic across calls", async () => {
        const a = await sha256("x");
        const b = await sha256("x");
        expect(a).toBe(b);
    });

    it("returns distinct hashes for different inputs", async () => {
        const a = await sha256("a");
        const b = await sha256("b");
        expect(a).not.toBe(b);
    });

    it("returns 64 lowercase hex characters", async () => {
        const h = await sha256("loupe");
        expect(h).toMatch(/^[0-9a-f]{64}$/);
    });
});
