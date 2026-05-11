import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";

import { autoMapColumns } from "../autoMap";

const col = (over: Partial<ColumnInference> & Pick<ColumnInference, "name" | "primaryType">): ColumnInference => ({
    confidence: 1,
    reasons: [],
    nullCount: 0,
    uniqueCount: 10,
    sampleValues: [],
    ...over,
});

describe("autoMapColumns", () => {
    it("age does NOT become outcome (no type-based fallback)", () => {
        const m = autoMapColumns([col({ name: "age_at_baseline", primaryType: "numeric" })]);
        expect(m.outcome).toBeUndefined();
        expect(m.time).toBeUndefined();
    });

    it("time-to-event semantic tag auto-maps to time regardless of column name", () => {
        const m = autoMapColumns([
            col({ name: "fu_months", primaryType: "numeric", semanticTag: "time-to-event" }),
        ]);
        expect(m.time).toBe("fu_months");
    });

    it("event-status semantic tag auto-maps to event", () => {
        const m = autoMapColumns([
            col({ name: "death_flag", primaryType: "binary", semanticTag: "event-status" }),
        ]);
        expect(m.event).toBe("death_flag");
    });

    it("patient-id semantic tag auto-maps to id", () => {
        const m = autoMapColumns([
            col({ name: "patient_id", primaryType: "categorical", semanticTag: "patient-id" }),
        ]);
        expect(m.id).toBe("patient_id");
    });

    it("treatment_arm categorical auto-maps to group via name pattern", () => {
        const m = autoMapColumns([
            col({ name: "treatment_arm", primaryType: "categorical", uniqueCount: 2 }),
        ]);
        expect(m.group).toBe("treatment_arm");
    });

    it("seeds a full KM mapping from a typical clinical dataset", () => {
        const m = autoMapColumns([
            col({ name: "patient_id", primaryType: "categorical", semanticTag: "patient-id" }),
            col({ name: "treatment_arm", primaryType: "categorical", uniqueCount: 2 }),
            col({ name: "age_at_baseline", primaryType: "numeric" }),
            col({ name: "stage", primaryType: "categorical", uniqueCount: 4 }),
            col({
                name: "time_to_event_months",
                primaryType: "numeric",
                semanticTag: "time-to-event",
            }),
            col({
                name: "event_observed",
                primaryType: "binary",
                semanticTag: "event-status",
            }),
        ]);
        expect(m).toEqual({
            id: "patient_id",
            group: "treatment_arm",
            time: "time_to_event_months",
            event: "event_observed",
        });
    });
});
