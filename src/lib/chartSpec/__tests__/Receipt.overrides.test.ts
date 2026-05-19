import { describe, expect, it } from "vitest";
import { z } from "zod";

import { receiptSchema } from "../schemas";
import type { Receipt } from "../types";

const ISO_AT_1 = "2026-05-19T14:23:00.000Z";
const ISO_AT_2 = "2026-05-19T14:25:00.000Z";

const baseReceipt = (): Receipt => ({
    alternatives: [],
    intent: "Compare arms",
    overrides: [],
    recommendation: {
        because: "Because body.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Handles body.",
        handlesTitle: "Handles",
        headline: "Headline.",
    },
    selectionMode: "ai",
    tests: [],
    testsTitle: "Tests",
    transformations: [],
});

const roundTrip = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

describe("Receipt.overrides", () => {
    it("round-trips a receipt with two override events", () => {
        const withOverrides: Receipt = {
            ...baseReceipt(),
            overrides: [
                { at: ISO_AT_1, from: "km", to: "box" },
                { at: ISO_AT_2, from: "box", to: "xy" },
            ],
        };
        const parsed = receiptSchema.parse(roundTrip(withOverrides));
        expect(parsed).toEqual(withOverrides);
    });

    it("defaults overrides to [] when the key is missing from JSON", () => {
        const withoutOverrides = { ...baseReceipt() };
        delete (withoutOverrides as { overrides?: unknown }).overrides;
        const parsed = receiptSchema.parse(roundTrip(withoutOverrides));
        expect(parsed.overrides).toEqual([]);
    });

    it("rejects an override with an invalid from kind", () => {
        const broken: unknown = {
            ...baseReceipt(),
            overrides: [{ at: ISO_AT_1, from: "roc", to: "box" }],
        };
        expect(receiptSchema.safeParse(broken).success).toBe(false);
    });

    it("rejects an override with a non-ISO at timestamp", () => {
        const broken: unknown = {
            ...baseReceipt(),
            overrides: [{ at: "not-a-date", from: "km", to: "box" }],
        };
        expect(receiptSchema.safeParse(broken).success).toBe(false);
    });

    it("fails to parse a legacy receipt when overrides preprocess is removed", () => {
        const withoutOverrides = { ...baseReceipt() };
        delete (withoutOverrides as { overrides?: unknown }).overrides;
        const legacyOnly = receiptSchema.safeParse(withoutOverrides);
        expect(legacyOnly.success).toBe(true);
        expect(legacyOnly.data?.overrides).toEqual([]);

        const noPreprocess = z
            .object({
                intent: z.string().min(1),
                overrides: z.array(z.object({ at: z.string(), from: z.string(), to: z.string() })),
            })
            .strict();
        expect(noPreprocess.safeParse(withoutOverrides).success).toBe(false);
    });
});
