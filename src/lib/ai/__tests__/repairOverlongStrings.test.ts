import type { RepairTextFunction } from "ai";
import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";

import { AI_RESPONSE_MAX_LENGTH, aiResponseSchema } from "../recommendChart.schemas";
import { repairOverlongStrings } from "../repairOverlongStrings";

type RepairError = Parameters<RepairTextFunction>[0]["error"];

// Verbatim label from a production gateway response that was rejected for exceeding tests[].label ≤ 120.
const OVERLONG_LABEL =
    "Log-rank test — compares overall survival curves between chemotherapy and observation arms; primary test for KM curve comparison.";

const validAiObject = {
    alternatives: [
        {
            name: "Bar with error bars",
            reason: "If focus were group means without time axis.",
            slug: "barError",
        },
    ],
    chartType: "km",
    confidence: 0.88,
    recommendation: {
        because: "Time-oriented outcome with event indicator suits survival-style curves.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Shows survival and censoring across arms.",
        handlesTitle: "Handles",
        headline: "A survival-style curve fits this intent.",
    },
    tests: [
        {
            label: "Illustrative check only",
        },
    ],
    testsTitle: "Statistical notes",
    transformations: [
        {
            chart: "KM plot",
            verb: "Plot as",
        },
    ],
};

const repairFor = async (candidate: unknown): Promise<string | null> => {
    const parsed = aiResponseSchema.safeParse(candidate);

    if (parsed.success) {
        throw new Error("Fixture must fail validation to exercise the repair path.");
    }

    return repairOverlongStrings({
        error: { cause: parsed.error satisfies ZodError } as unknown as RepairError,
        text: JSON.stringify(candidate),
    });
};

describe("repairOverlongStrings", () => {
    it("truncates an overlong tests[].label so the response passes the schema", async () => {
        const candidate = {
            ...validAiObject,
            tests: [
                {
                    label: OVERLONG_LABEL,
                },
            ],
        };

        const repaired = await repairFor(candidate);
        const reparsed = aiResponseSchema.safeParse(JSON.parse(repaired ?? "null"));

        expect(OVERLONG_LABEL.length).toBeGreaterThan(AI_RESPONSE_MAX_LENGTH["tests[].label"]);
        expect(reparsed.success).toBe(true);
        expect(reparsed.data?.tests[0]?.label.length).toBeLessThanOrEqual(AI_RESPONSE_MAX_LENGTH["tests[].label"]);
        expect(reparsed.data?.tests[0]?.label).toMatch(/^Log-rank test — compares overall survival.*…$/);
    });

    it("leaves other fields untouched while repairing", async () => {
        const candidate = {
            ...validAiObject,
            tests: [
                {
                    label: OVERLONG_LABEL,
                },
            ],
        };

        const repaired = JSON.parse((await repairFor(candidate)) ?? "null");

        expect(repaired.recommendation).toEqual(validAiObject.recommendation);
        expect(repaired.alternatives).toEqual(validAiObject.alternatives);
    });

    it("returns null when an overlong string is mixed with another violation", async () => {
        const candidate = {
            ...validAiObject,
            chartType: "violin",
            tests: [
                {
                    label: OVERLONG_LABEL,
                },
            ],
        };

        await expect(repairFor(candidate)).resolves.toBeNull();
    });

    it("returns null when the cause is not a schema validation error", async () => {
        const repaired = await repairOverlongStrings({
            error: { cause: new SyntaxError("Unexpected end of JSON input") } as unknown as RepairError,
            text: "{\"chartType\":",
        });

        expect(repaired).toBeNull();
    });
});
