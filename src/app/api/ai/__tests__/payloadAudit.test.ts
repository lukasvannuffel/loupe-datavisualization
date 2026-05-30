import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";
import type { Mapping } from "@/lib/roles/types";
import type { ChartSpec } from "@/lib/chartSpec/types";

import { recommendChart } from "@/lib/ai/recommendChart";
import { payloadSchema } from "@/lib/ai/recommendChart.schemas";
import type { RecommendInput, RecommendPayload } from "@/lib/ai/recommendChart.types";
import { toAiColumns } from "@/lib/ai/toAiColumns";

const generateObjectMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
    generateObject: generateObjectMock,
}));

vi.mock("@/lib/ai/client", () => ({
    createGatewayLanguageModel: vi.fn(() => ({})),
    getEnv: vi.fn(() => ({
        apiKey: "test-key",
        model: "anthropic/claude-sonnet-4.6",
    })),
}));

vi.mock("@/lib/ai/rateLimit/actorKey", () => ({
    resolveActorKey: vi.fn().mockResolvedValue("user:audit"),
}));

vi.mock("@/lib/ai/rateLimit/rateLimit", () => ({
    checkAndRecord: vi.fn().mockResolvedValue({ allowed: true, remaining: 19 }),
}));

const col = (
    over: Partial<ColumnInference> & Pick<ColumnInference, "name" | "primaryType">,
): ColumnInference => ({
    confidence: 0.92,
    nullCount: 0,
    reasons: [],
    sampleValues: ["LEAK-001", "LEAK-002"],
    uniqueCount: 10,
    ...over,
});

const MEDICAL_INFERENCES: readonly ColumnInference[] = [
    col({ name: "patient_id", primaryType: "categorical", semanticTag: "patient-id", uniqueCount: 120 }),
    col({ name: "treatment_arm", primaryType: "categorical", uniqueCount: 2 }),
    col({ name: "time_to_event_months", primaryType: "numeric", semanticTag: "time-to-event" }),
    col({ name: "event_observed", primaryType: "binary", semanticTag: "event-status", uniqueCount: 2 }),
    col({ name: "tumor_volume_mm3", primaryType: "numeric" }),
    col({ name: "visit_day", primaryType: "integer" }),
    col({ name: "biomarker_score", primaryType: "numeric" }),
];

const CHART_FIXTURES: ReadonlyArray<{
    readonly kind: ChartSpec["kind"];
    readonly intent: string;
    readonly mapping: Mapping;
}> = [
    {
        kind: "km",
        intent: "Compare overall survival between pembrolizumab and placebo arms.",
        mapping: {
            event: "event_observed",
            group: "treatment_arm",
            id: "patient_id",
            time: "time_to_event_months",
        },
    },
    {
        kind: "barError",
        intent: "Compare mean tumor volume reduction with 95% CI between arms at week 12.",
        mapping: {
            group: "treatment_arm",
            outcome: "tumor_volume_mm3",
        },
    },
    {
        kind: "box",
        intent: "Show distribution of baseline biomarker scores by treatment arm.",
        mapping: {
            group: "treatment_arm",
            outcome: "biomarker_score",
        },
    },
    {
        kind: "xy",
        intent: "Plot longitudinal biomarker score against visit day for each subject.",
        mapping: {
            id: "patient_id",
            x: "visit_day",
            y: "biomarker_score",
        },
    },
];

const TOP_LEVEL_KEYS = new Set(["columns", "intent", "mapping"]);
const COLUMN_KEYS = new Set(["name", "primaryType", "nullCount", "uniqueCount", "semanticTag"]);
const MAPPING_KEYS = new Set([
    "time",
    "event",
    "group",
    "outcome",
    "predictor",
    "x",
    "y",
    "id",
    "ignore",
]);

const buildPayload = (fixture: (typeof CHART_FIXTURES)[number]): RecommendPayload => ({
    columns: toAiColumns(MEDICAL_INFERENCES),
    intent: fixture.intent,
    mapping: fixture.mapping,
});

const assertPrivacyClean = (serialized: string): void => {
    expect(serialized).not.toContain("LEAK-001");
    expect(serialized).not.toContain("LEAK-002");
    expect(serialized).not.toMatch(/sampleValues/i);
    expect(serialized).not.toMatch(/"rows"/);
    expect(serialized).not.toMatch(/"values"/);
    expect(serialized).not.toMatch(/"data"/);
};

const assertSchemaKeys = (payload: RecommendPayload): void => {
    for (const key of Object.keys(payload)) {
        expect(TOP_LEVEL_KEYS.has(key)).toBe(true);
    }

    for (const column of payload.columns) {
        for (const key of Object.keys(column)) {
            expect(COLUMN_KEYS.has(key)).toBe(true);
        }
    }

    for (const key of Object.keys(payload.mapping)) {
        expect(MAPPING_KEYS.has(key)).toBe(true);
    }
};

describe("LOUPE-23 payloadAudit — Server Action boundary (recommendChart)", () => {
    beforeEach(() => {
        generateObjectMock.mockReset();
    });

    it("documents that Loupe uses recommendChart Server Action, not /api/ai/recommend route", () => {
        expect(typeof recommendChart).toBe("function");
    });

    for (const fixture of CHART_FIXTURES) {
        it(`privacy audit: ${fixture.kind} payload serializes only column names + types, never values`, () => {
            const payload = buildPayload(fixture);
            const serialized = JSON.stringify(payload);

            assertPrivacyClean(serialized);
            assertSchemaKeys(payload);

            const parsed = payloadSchema.safeParse(payload);

            expect(parsed.success).toBe(true);
        });
    }

    it("schema key audit: rejects unknown top-level keys", () => {
        const payload = {
            ...buildPayload(CHART_FIXTURES[0]!),
            extraField: "must-not-ship",
        } as unknown as RecommendInput;

        const parsed = payloadSchema.safeParse(payload);

        expect(parsed.success).toBe(false);
    });

    it("rejects top-level values before calling the model (privacy)", async () => {
        const bad = {
            ...buildPayload(CHART_FIXTURES[0]!),
            values: [{ patient_id: "P-001" }],
        } as unknown as RecommendInput;

        const result = await recommendChart(bad);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            code: "PRIVACY_VIOLATION",
            message: "Payload contains forbidden fields.",
            ok: false,
        });
    });

    // MUTATION-VERIFY: add `values` to buildPayload return in this file (mapping.values = ['x']);
    // Exact change: buildPayload append `values: ['P-001']` to returned object.
    // Exact test that goes red: "privacy audit: km payload serializes only column names + types, never values"
    // Verified manually: 2026-05-30. REVERTED.
    it("mutation-verify: adding values field fails privacy audit regex on serialized output", () => {
        const payload = buildPayload(CHART_FIXTURES[0]!);
        const mutated = JSON.stringify({ ...payload, values: ["P-001"] });

        expect(mutated).toMatch(/"values"/);
        expect(() => assertPrivacyClean(mutated)).toThrow();
    });
});
