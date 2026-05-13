import { describe, expect, it } from "vitest";

import { detectPhiColumns } from "../detect";

describe("detectPhiColumns", () => {
    it("flags personal-name style headers (multiple fixtures per rule)", () => {
        expect(detectPhiColumns(["First Name"]).map((m) => m.reason)).toContain("personal name");
        expect(detectPhiColumns(["last_name"]).map((m) => m.reason)).toContain("personal name");
        expect(detectPhiColumns(["Name"]).map((m) => m.reason)).toContain("personal name");
        expect(detectPhiColumns(["initials"]).map((m) => m.reason)).toContain("personal initials");
    });

    it("flags compound personal-name headers (word-boundary / underscore forms)", () => {
        expect(detectPhiColumns(["patient_first_name"]).length).toBeGreaterThan(0);
        expect(detectPhiColumns(["subject_full_name"]).length).toBeGreaterThan(0);
        expect(detectPhiColumns(["Patient Last Name"]).length).toBeGreaterThan(0);
    });

    it("flags DOB and record identifiers", () => {
        expect(detectPhiColumns(["dob"]).map((m) => m.reason)).toContain("date of birth");
        expect(detectPhiColumns(["Date of Birth"]).map((m) => m.reason)).toContain("date of birth");
        expect(detectPhiColumns(["mrn"]).map((m) => m.reason)).toContain("medical record number");
        expect(detectPhiColumns(["Medical Record Number"]).map((m) => m.reason)).toContain(
            "medical record number",
        );
    });

    it("flags government and insurance identifiers", () => {
        expect(detectPhiColumns(["ssn"]).map((m) => m.reason)).toContain("social security number");
        expect(detectPhiColumns(["social security"]).map((m) => m.reason)).toContain(
            "social security number",
        );
        expect(detectPhiColumns(["insurance"]).map((m) => m.reason)).toContain("insurance identifier");
        expect(detectPhiColumns(["policy number"]).map((m) => m.reason)).toContain(
            "insurance identifier",
        );
    });

    it("flags address and contact channels", () => {
        expect(detectPhiColumns(["address"]).map((m) => m.reason)).toContain("address");
        expect(detectPhiColumns(["postal_code"]).map((m) => m.reason)).toContain("address");
        expect(detectPhiColumns(["phone"]).map((m) => m.reason)).toContain("phone number");
        expect(detectPhiColumns(["mobile"]).map((m) => m.reason)).toContain("phone number");
        expect(detectPhiColumns(["email"]).map((m) => m.reason)).toContain("email address");
    });

    it("ignores benign clinical column names (including treatment_name)", () => {
        const headers = [
            "treatment_arm",
            "outcome",
            "time_days",
            "crp_mg_l",
            "patient_id",
            "age",
            "treatment_name",
            "outcome_name",
            "phone_followup",
        ];

        expect(detectPhiColumns(headers)).toEqual([]);
    });

    it("preserves header order for mixed datasets", () => {
        const headers = ["outcome", "Email", "Phone", "time_days"];

        expect(detectPhiColumns(headers).map((m) => m.column)).toEqual(["Email", "Phone"]);
    });
});
