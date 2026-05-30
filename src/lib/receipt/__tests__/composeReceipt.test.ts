import { describe, expect, it } from "vitest";

import type { ChartSpec } from "@/lib/chartSpec/types";

import {
    composeReceipt,
    PRIVACY_STATEMENT,
    type ComputationSummary,
    type ReceiptInput,
} from "../composeReceipt";

const kmSpec: ChartSpec = {
    kind: "km",
    version: 1,
    id: "spec-km",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "Overall survival",
    showLegend: true,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    legendA: "A",
    dashB: false,
    showAtRisk: true,
    showStats: true,
    timeUnit: "months",
};

const kmComputations: ComputationSummary = {
    chartType: "km",
    kmCensoredN: 218,
    kmTotalN: 610,
    kmGroupCount: 2,
    kmStepCount: 48,
    dataColumns: ["arm", "days", "status"],
    computedAt: "2026-05-27T12:00:00.000Z",
};

const baseInput: ReceiptInput = {
    spec: kmSpec,
    aiReasoning:
        "Compare survival between arms with right-censoring. Kaplan-Meier was chosen over box plot because time-to-event needs censoring.",
    computations: kmComputations,
    generatedAt: "2026-05-27T12:05:00.000Z",
};

const PLAIN_SECTIONS = [
    "INTENT",
    "CHART RECOMMENDATION",
    "ALTERNATIVES CONSIDERED",
    "COMPUTATIONS PERFORMED",
    "PRIVACY STATEMENT",
    "CONFIGURATION HASH",
] as const;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();
const RECEIPT_SEPARATOR = "-".repeat(80);

const MARKDOWN_SECTIONS = [
    "## Intent",
    "## Chart recommendation",
    "## Alternatives considered",
    "## Computations performed",
    "## Privacy statement",
    "## Configuration hash",
] as const;

describe("composeReceipt", () => {
    it("plain text contains all six sections for KM chart", async () => {
        const receipt = await composeReceipt(baseInput);

        for (const section of PLAIN_SECTIONS) {
            expect(receipt.plainText).toContain(section);
        }
    });

    it("markdown contains all six sections for KM chart", async () => {
        const receipt = await composeReceipt(baseInput);

        for (const section of MARKDOWN_SECTIONS) {
            expect(receipt.markdown).toContain(section);
        }
    });

    it("KM receipt mentions censoredN and totalN", async () => {
        const receipt = await composeReceipt(baseInput);

        expect(receipt.plainText).toContain("218");
        expect(receipt.plainText).toContain("610");
    });

    it("privacy statement is present and verbatim", async () => {
        const receipt = await composeReceipt(baseInput);

        const privacyBlock =
            receipt.plainText.split("PRIVACY STATEMENT")[1]?.split(RECEIPT_SEPARATOR)[0] ?? "";

        expect(collapseWhitespace(privacyBlock)).toBe(PRIVACY_STATEMENT);
        expect(receipt.markdown).toContain(PRIVACY_STATEMENT);
    });

    it("hash is a 64-char hex string", async () => {
        const receipt = await composeReceipt(baseInput);

        expect(receipt.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("assertNoRawData throws on numeric array in summary", async () => {
        const leaky = {
            ...kmComputations,
            leak: [1, 2, 3],
        } as ComputationSummary;

        await expect(
            composeReceipt({
                ...baseInput,
                computations: leaky,
            }),
        ).rejects.toThrow(/numeric arrays/);
    });

    it("aiReasoning appears verbatim in INTENT section", async () => {
        const receipt = await composeReceipt(baseInput);

        expect(collapseWhitespace(receipt.plainText)).toContain(baseInput.aiReasoning);
        expect(receipt.markdown).toContain(baseInput.aiReasoning);
    });

    it("plain text lines are max 80 characters", async () => {
        const receipt = await composeReceipt(baseInput);

        for (const line of receipt.plainText.split("\n")) {
            expect(line.length).toBeLessThanOrEqual(80);
        }
    });

    // MUTATION-VERIFY: composeReceipt.ts PRIVACY_STATEMENT — append " mutated".
    // Test: "privacy statement is present and verbatim". Verified manually: 2026-05-30. REVERTED.
});
