import { describe, expect, it } from "vitest";

import {
    detectBinary,
    detectCategorical,
    detectDate,
    detectDatetime,
    detectInteger,
    detectNumeric,
    resolvePrimary,
} from "../detectors/primary";
import {
    detectEventStatus,
    detectPatientId,
    detectTimeToEvent,
} from "../detectors/semantic";

describe("detectNumeric", () => {
    it("fires on a column that is 100% numeric", () => {
        const result = detectNumeric(["1.5", "2.7", "3.0", "4.4", "5.1"]);
        expect(result.matches).toBe(true);
        expect(result.confidence).toBe(1);
    });

    it("does not fire below 80%", () => {
        const result = detectNumeric(["1", "2", "x", "y", "z"]);
        expect(result.matches).toBe(false);
    });

    it("confidence is monotonic — 100% > 85%", () => {
        const fully = detectNumeric(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
        const mostly = detectNumeric(["1", "2", "3", "4", "5", "6", "7", "8", "x", "y"]);
        expect(fully.confidence).toBeGreaterThan(mostly.confidence);
    });
});

describe("detectInteger", () => {
    it("fires on integers", () => {
        const result = detectInteger(["1", "2", "3", "4", "5"]);
        expect(result.matches).toBe(true);
    });

    it("rejects mostly-decimal columns", () => {
        const result = detectInteger(["1.5", "2.7", "3.4", "4.1", "5.2"]);
        expect(result.matches).toBe(false);
    });
});

describe("detectBinary", () => {
    it("returns 0.95 for known patterns", () => {
        expect(detectBinary(["yes", "no", "yes", "no"]).confidence).toBe(0.95);
        expect(detectBinary(["0", "1", "0", "1"]).confidence).toBe(0.95);
        expect(detectBinary(["M", "F", "M", "F"]).confidence).toBe(0.95);
    });

    it("returns 0.6 when 2 distinct values are not a known pattern", () => {
        const result = detectBinary(["apple", "pear", "apple", "pear"]);
        expect(result.matches).toBe(true);
        expect(result.confidence).toBe(0.6);
    });

    it("rejects when distinct count is not exactly 2", () => {
        expect(detectBinary(["a", "b", "c"]).matches).toBe(false);
        expect(detectBinary(["a", "a", "a"]).matches).toBe(false);
    });
});

describe("detectCategorical", () => {
    it("fires when distinct ≤ 20 and ratio ≤ 0.5 and not numeric", () => {
        const result = detectCategorical(["a", "b", "c", "a", "b", "c", "a", "b"]);
        expect(result.matches).toBe(true);
    });

    it("does not fire on numeric columns", () => {
        const result = detectCategorical(["1", "2", "3", "1", "2", "3"]);
        expect(result.matches).toBe(false);
    });

    it("clamps confidence to [0.55, 0.95] — never returns exactly 0.5", () => {
        // Boundary case: 10 values, 5 distinct, ratio = 0.5 — would be 0.5 unclamped.
        const boundary = detectCategorical(["a", "b", "c", "d", "e", "a", "b", "c", "d", "e"]);
        expect(boundary.confidence).not.toBe(0.5);
        expect(boundary.confidence).toBeGreaterThanOrEqual(0.55);
        expect(boundary.confidence).toBeLessThanOrEqual(0.95);
        // High-repetition case: 10 values, 2 distinct, ratio = 0.2 — confidence should clamp to 0.95.
        const highRep = detectCategorical(["a", "a", "a", "a", "a", "b", "b", "b", "b", "b"]);
        expect(highRep.confidence).toBeLessThanOrEqual(0.95);
    });
});

describe("detectDate", () => {
    it("fires on ISO 8601 dates", () => {
        const result = detectDate(["2024-01-15", "2024-02-20", "2024-03-10", "2024-04-05", "2024-05-12"]);
        expect(result.matches).toBe(true);
    });

    it("does NOT fire on non-ISO date formats — locale guessing is forbidden", () => {
        const result = detectDate(["15/03/2024", "16/03/2024", "17/03/2024", "18/03/2024", "19/03/2024"]);
        expect(result.matches).toBe(false);
        expect(result.confidence).toBe(0);
    });

    it("rejects impossible dates that match the regex", () => {
        const result = detectDate(["2024-13-45", "2024-99-99", "2024-15-32", "2024-00-00", "2024-20-50"]);
        expect(result.matches).toBe(false);
    });

    it("misses the 80% bar with mixed valid/invalid", () => {
        const result = detectDate(["2024-01-15", "x", "2024-02-20", "y", "2024-03-10"]);
        expect(result.matches).toBe(false);
    });
});

describe("detectDatetime", () => {
    it("fires on ISO 8601 datetimes", () => {
        const result = detectDatetime([
            "2024-01-15T14:30:00Z",
            "2024-02-20T09:15:00Z",
            "2024-03-10T16:45:00Z",
            "2024-04-05T11:00:00Z",
            "2024-05-12T13:20:00Z",
        ]);
        expect(result.matches).toBe(true);
    });

    it("rejects plain dates", () => {
        const result = detectDatetime(["2024-01-15", "2024-02-20", "2024-03-10"]);
        expect(result.matches).toBe(false);
    });
});

describe("resolvePrimary tie-breaks", () => {
    it("integer beats numeric (more specific)", () => {
        const result = resolvePrimary(["1", "2", "3", "4", "5"]);
        expect(result.primaryType).toBe("integer");
    });

    it("datetime beats date (more specific)", () => {
        const result = resolvePrimary([
            "2024-01-15T14:30:00Z",
            "2024-02-20T09:15:00Z",
            "2024-03-10T16:45:00Z",
        ]);
        expect(result.primaryType).toBe("datetime");
    });

    it("known-pattern binary beats integer", () => {
        const result = resolvePrimary(["0", "1", "0", "1", "0", "1"]);
        expect(result.primaryType).toBe("binary");
    });

    it("empty values branch → reason 'column has no values'", () => {
        const result = resolvePrimary([]);
        expect(result.primaryType).toBe("categorical");
        expect(result.confidence).toBe(0.4);
        expect(result.reasons).toEqual(["column has no values"]);
    });

    it("nothing-matched branch → reason 'no detector reached 0.5 confidence'", () => {
        const result = resolvePrimary(["one-off-1", "one-off-2", "one-off-3", "one-off-4", "one-off-5"]);
        expect(result.primaryType).toBe("categorical");
        expect(result.confidence).toBe(0.4);
        expect(result.reasons).toEqual(["no detector reached 0.5 confidence"]);
    });
});

describe("semantic detectors", () => {
    it("detectTimeToEvent fires on time/months/survival names with non-negative numerics", () => {
        expect(detectTimeToEvent("time_to_event_months", "numeric", ["1", "2", "3"])).toBe(true);
        expect(detectTimeToEvent("survival_years", "numeric", ["3.5", "5.2"])).toBe(true);
        expect(detectTimeToEvent("t_event_days", "integer", ["120", "85"])).toBe(true);
    });

    it("detectTimeToEvent rejects non-numeric primaries", () => {
        expect(detectTimeToEvent("time_x", "categorical", ["a", "b"])).toBe(false);
    });

    it("detectTimeToEvent rejects negative values", () => {
        expect(detectTimeToEvent("time_x", "numeric", ["-1", "2"])).toBe(false);
    });

    it("detectTimeToEvent requires parsedRatio ≥ 0.9", () => {
        // 80% parseable — primary may be numeric, but time-to-event must NOT fire.
        expect(
            detectTimeToEvent(
                "time_x",
                "numeric",
                ["1", "2", "3", "4", "5", "6", "7", "8", "x", "y"],
            ),
        ).toBe(false);
        // 90% parseable — fires.
        expect(
            detectTimeToEvent(
                "time_x",
                "numeric",
                ["1", "2", "3", "4", "5", "6", "7", "8", "9", "x"],
            ),
        ).toBe(true);
    });

    it("detectEventStatus fires on binary + event-name", () => {
        expect(detectEventStatus("event_observed", "binary")).toBe(true);
        expect(detectEventStatus("death_status", "binary")).toBe(true);
        expect(detectEventStatus("relapse_event", "binary")).toBe(true);
    });

    it("detectEventStatus rejects non-binary primaries", () => {
        expect(detectEventStatus("event_count", "integer")).toBe(false);
    });

    it("detectPatientId fires on id-like names with high uniqueness", () => {
        expect(detectPatientId("id", 100, 100)).toBe(true);
        expect(detectPatientId("patient_id", 95, 100)).toBe(true);
        expect(detectPatientId("patientid", 100, 100)).toBe(true);
        expect(detectPatientId("record_id", 100, 100)).toBe(true);
        expect(detectPatientId("subject", 100, 100)).toBe(true);
    });

    it("detectPatientId rejects bare 'patient' / 'record' (ambiguous without _id suffix)", () => {
        expect(detectPatientId("patient", 100, 100)).toBe(false);
        expect(detectPatientId("record", 100, 100)).toBe(false);
    });

    it("detectPatientId rejects low uniqueness", () => {
        expect(detectPatientId("patient_id", 5, 100)).toBe(false);
    });
});
