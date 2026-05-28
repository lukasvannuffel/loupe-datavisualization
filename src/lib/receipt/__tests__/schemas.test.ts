import { describe, expect, it } from "vitest";

import { receiptSchema } from "@/lib/receipt/schemas";

const baseReceipt = {
    generated_at: "2026-05-28T08:00:00.000Z",
    config_hash: "sha256·abcdef12…beef",
    method: "Kaplan-Meier estimator, Greenwood log-log CI",
    sample: "n = 100 · censored = 0",
    palette: "editorial",
    ai_rationale: "reason",
    csv_columns: ["time", "event"],
    n_rows_input: 100,
};

describe("receiptSchema software version", () => {
    it("accepts prerelease software versions", () => {
        const parsed = receiptSchema.safeParse({
            ...baseReceipt,
            software: "Loupe v0.1.0-beta · client-side",
        });

        expect(parsed.success).toBe(true);
    });

    it("accepts stable software versions", () => {
        const parsed = receiptSchema.safeParse({
            ...baseReceipt,
            software: "Loupe v0.1.0 · client-side",
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects malformed semver software versions", () => {
        const parsed = receiptSchema.safeParse({
            ...baseReceipt,
            software: "Loupe v0.1 · client-side",
        });

        expect(parsed.success).toBe(false);
    });
});
