import { describe, expect, it } from "vitest";

import type { Mapping } from "@/app/providers";

import { getCompatibility } from "../compatibility";

describe("getCompatibility", () => {
    it("a KM-shaped mapping (time + event + group) marks KM compatible with no missing roles", () => {
        const mapping: Mapping = {
            time: "time_to_event_months",
            event: "event_observed",
            group: "treatment_arm",
        };
        const result = getCompatibility(mapping);
        expect(result.km.compatible).toBe(true);
        expect(result.km.missingRoles).toEqual([]);
        expect(result.km.missingLabels).toEqual([]);
    });

    it("a mapping without `time` marks KM incompatible with `time` listed as missing", () => {
        const mapping: Mapping = {
            event: "event_observed",
            group: "treatment_arm",
        };
        const result = getCompatibility(mapping);
        expect(result.km.compatible).toBe(false);
        expect(result.km.missingRoles).toEqual(["time"]);
        expect(result.km.missingLabels).toEqual(["Time variable"]);
    });

    it("a fully-loaded mapping satisfies all four V1 charts", () => {
        const mapping: Mapping = {
            time: "t",
            event: "e",
            group: "g",
            outcome: "o",
            predictor: "p",
        };
        const result = getCompatibility(mapping);
        expect(result.km.compatible).toBe(true);
        expect(result.barError.compatible).toBe(true);
        expect(result.roc.compatible).toBe(true);
        expect(result.forest.compatible).toBe(true);
    });

    it("an empty mapping marks every chart incompatible with the right missing-role labels", () => {
        const result = getCompatibility({});
        expect(result.km.missingRoles).toEqual(["time", "event"]);
        expect(result.km.missingLabels).toEqual(["Time variable", "Event indicator"]);
        expect(result.barError.missingRoles).toEqual(["group", "outcome"]);
        expect(result.barError.missingLabels).toEqual(["Group / arm", "Outcome"]);
        expect(result.roc.missingRoles).toEqual(["predictor", "outcome"]);
        expect(result.roc.missingLabels).toEqual(["Predictor", "Outcome"]);
        expect(result.forest.missingRoles).toEqual(["group", "outcome"]);
        expect(result.forest.missingLabels).toEqual(["Group / arm", "Outcome"]);
    });

    it("treats `ignore`-mapped columns as unassigned (does not count toward satisfying a required role)", () => {
        const mapping: Mapping = {
            ignore: "time_to_event_months",
            event: "event_observed",
        };
        const result = getCompatibility(mapping);
        expect(result.km.missingRoles).toContain("time");
    });

    it("treats `undefined` role values as unassigned", () => {
        const mapping: Mapping = {
            time: undefined,
            event: "event_observed",
        };
        const result = getCompatibility(mapping);
        expect(result.km.missingRoles).toContain("time");
    });
});
