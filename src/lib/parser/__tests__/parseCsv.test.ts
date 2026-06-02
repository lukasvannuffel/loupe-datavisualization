import { describe, expect, it } from "vitest";

import { parseCsv } from "../parseCsv";

const fileFromText = (text: string, name = "x.csv"): File => {
    return new File([text], name, { type: "text/csv" });
};

describe("parseCsv", () => {
    it("parses 10,000 rows × 4 columns under the perf budget", async () => {
        const header = "a,b,c,d";
        const row = "1,2,3,4";
        const lines: string[] = [header];
        for (let i = 0; i < 10000; i++) {
            lines.push(row);
        }
        const file = fileFromText(lines.join("\n"), "big.csv");

        const start = Date.now();
        const result = await parseCsv(file);
        const elapsed = Date.now() - start;

        expect(result.rowCount).toBe(10000);
        expect(result.headers).toEqual(["a", "b", "c", "d"]);
        expect(result.sourceFormat).toBe("csv");
        expect(result.fileName).toBe("big.csv");
        expect(elapsed).toBeLessThan(2000);
    }, 10000);

    it("strips a UTF-8 BOM from the first header", async () => {
        const file = fileFromText("﻿a,b\n1,2");

        const result = await parseCsv(file);

        expect(result.headers).toEqual(["a", "b"]);
        expect(result.rowCount).toBe(1);
    });

    it("handles mixed CRLF and LF line endings", async () => {
        const file = fileFromText("a,b\r\n1,2\n3,4\r\n5,6");

        const result = await parseCsv(file);

        expect(result.headers).toEqual(["a", "b"]);
        expect(result.rowCount).toBe(3);
    });

    it("rejects with NO_COLUMNS when there is no header row", async () => {
        const file = fileFromText("");

        await expect(parseCsv(file)).rejects.toMatchObject({ code: "NO_COLUMNS" });
    });

    it("parses a single-column file", async () => {
        const file = fileFromText("only\n1\n2\n3");

        const result = await parseCsv(file);

        expect(result.headers).toEqual(["only"]);
        expect(result.rowCount).toBe(3);
    });

    it("throws MULTI_TABLE_DETECTED for side-by-side tables", async () => {
        const file = fileFromText(
            [
                "PatientID,Age,Group,,SubjectID,Score,Arm",
                "1,45,A,,101,0.8,Treatment",
                "2,50,B,,102,0.6,Control",
            ].join("\n"),
            "horizontal-split.csv",
        );

        await expect(parseCsv(file)).rejects.toMatchObject({
            code: "MULTI_TABLE_DETECTED",
            cause: expect.objectContaining({ reason: "horizontal_split" }),
        });
    });

    it("does NOT flag trailing empty columns as multi-table", async () => {
        const file = fileFromText(
            ["PatientID,Age,Group,,,", "1,45,A,,,", "2,50,B,,,"].join("\n"),
            "trailing-empty-cols.csv",
        );

        const result = await parseCsv(file);
        expect(result.headers[0]).toBe("PatientID");
        expect(result.headers[1]).toBe("Age");
        expect(result.headers[2]).toBe("Group");
        expect(result.headers).toHaveLength(6);
        expect(result.rowCount).toBe(2);
    });

    it("parses semicolon CSV with Belgian decimals without multi-table false positive", async () => {
        const file = fileFromText(
            [
                "patient_id;treatment_group;age;sex;bmi;baseline_hba1c;week12_hba1c;hba1c_change",
                "PT-1001;Placebo;63;M;37,6;8,6;8,4;-0,16",
                "PT-1002;Placebo;39;F;29,5;7,7;7,5;-0,16",
            ].join("\n"),
            "diabetes_trial_hba1c.csv",
        );

        const result = await parseCsv(file);
        expect(result.rowCount).toBe(2);
        expect(result.headers).toEqual([
            "patient_id",
            "treatment_group",
            "age",
            "sex",
            "bmi",
            "baseline_hba1c",
            "week12_hba1c",
            "hba1c_change",
        ]);
    });

    it("throws MULTI_TABLE_DETECTED for stacked tables with digit-bearing headers", async () => {
        const file = fileFromText(
            [
                "subject_id,iief_0,12 months (n)",
                "S-001,17,24",
                "S-002,21,18",
                "subject_id,iief_6,24 months (n)",
                "S-003,19,12",
                "S-004,15,10",
            ].join("\n"),
            "vertical-stacked-digit-headers.csv",
        );

        await expect(parseCsv(file)).rejects.toMatchObject({
            code: "MULTI_TABLE_DETECTED",
            cause: expect.objectContaining({ reason: "embedded_header" }),
        });
    });

    it("parses single-table semicolon decimal-comma data with digit-bearing headers", async () => {
        const file = fileFromText(
            [
                "subject_id;iief_0;12 months (n)",
                "S-001;17,5;24",
                "S-002;21,0;18",
            ].join("\n"),
            "single-table-digit-headers-decimal-comma.csv",
        );

        const result = await parseCsv(file);
        expect(result.rowCount).toBe(2);
        expect(result.headers).toEqual(["subject_id", "iief_0", "12 months (n)"]);
    });

    it("blocks stacked summary semicolon csv with repeated section headers", async () => {
        const file = fileFromText(
            [
                "COUNT;PERCENT;varblname;levels;;;;;;;;;;;;;;;",
                ";;iief_0;.;;;;;;;;;;;;;;;",
                ";;iief_0;Invalid (0);;;;;;Baseline (n);%;1 month (n);%;3 months (n);%",
                ";;iief_0;Severe (1-7);;;;;Severe (1-7);;;;;;;;;;",
                ";;iief_1;.;;;;;;;;;;;;;;;",
                ";;iief_1;Invalid (0);;;;;;;;;;;;;;;",
            ].join("\n"),
            "20230925tIIEF_Lucas.csv",
        );

        await expect(parseCsv(file)).rejects.toMatchObject({
            code: "MULTI_TABLE_DETECTED",
            cause: expect.objectContaining({ reason: "embedded_header" }),
        });
    });
});
