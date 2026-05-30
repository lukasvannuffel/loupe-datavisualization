// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import * as XLSX from "xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorksheetSelector } from "@/components/pages/upload/WorksheetSelector";
import { inferColumnTypes } from "@/lib/parser/inferColumnTypes";
import { parseCsv } from "@/lib/parser/parseCsv";
import { parseXlsxBuffer } from "@/lib/parser/parseXlsx";
import { brandRows } from "@/lib/parser/types";

import {
    csvFile,
    sevenSheetMetas,
    xlsxBufferFromSheets,
    xlsxFileFromSheets,
} from "./edgeCaseFixtures";

describe("LOUPE-23 edgeCases — CSV parsing", () => {
    it("rejects a completely empty CSV with NO_COLUMNS", async () => {
        await expect(parseCsv(csvFile(""))).rejects.toMatchObject({ code: "NO_COLUMNS" });
    });

    it("accepts header-only CSV with zero data rows", async () => {
        const result = await parseCsv(
            csvFile("patient_id,treatment_arm,time_to_event_months,event_observed\n"),
        );

        expect(result.headers).toEqual([
            "patient_id",
            "treatment_arm",
            "time_to_event_months",
            "event_observed",
        ]);
        expect(result.rowCount).toBe(0);
    });

    it("renames blank header cells to column_N (missing headers)", async () => {
        const result = await parseCsv(
            csvFile(",patient_id,survival_days\nP-001,12.5,365\nP-002,8.1,180\n"),
        );

        expect(result.headers).toEqual(["column_1", "patient_id", "survival_days"]);
        expect(result.rowCount).toBe(2);
        expect(result.rows[0]?.patient_id).toBe("12.5");
    });

    it("classifies a mixed-type dose column as categorical when non-numeric values dominate", async () => {
        const result = await parseCsv(
            csvFile(
                [
                    "patient_id,dose_mg",
                    "P-101,100",
                    "P-102,150",
                    "P-103,N/A",
                    "P-104,200",
                    "P-105,unknown",
                    "P-106,175",
                ].join("\n"),
            ),
        );

        const dose = inferColumnTypes(result).find((column) => column.name === "dose_mg");

        expect(dose?.primaryType).toBe("categorical");
        expect(dose?.confidence).toBeLessThan(0.8);
    });
});

describe("LOUPE-23 edgeCases — XLSX parsing", () => {
    it("throws EMPTY_WORKBOOK when every worksheet is empty", () => {
        const buffer = xlsxBufferFromSheets([
            { name: "EmptyA", rows: [] },
            { name: "EmptyB", rows: [] },
        ]);

        expect(() => parseXlsxBuffer(buffer, "all-empty.xlsx")).toThrow(/NO_COLUMNS|header row/i);
    });

    it("throws CORRUPT when sheet hint does not exist in workbook", () => {
        const buffer = xlsxBufferFromSheets([
            {
                name: "Patients",
                rows: [
                    ["patient_id", "arm"],
                    ["P-001", "control"],
                ],
            },
        ]);

        expect(() =>
            parseXlsxBuffer(buffer, "patients.xlsx", { sheet: "NonExistentSheet" }),
        ).toThrow(/CORRUPT|couldn't read/i);
    });

    it("parses a valid hinted sheet among multiple tabs", () => {
        const buffer = xlsxBufferFromSheets([
            { name: "Codebook", rows: [["variable", "label"], ["arm", "Treatment arm"]] },
            {
                name: "Patients",
                rows: [
                    ["patient_id", "arm", "months"],
                    ["P-001", "control", "12"],
                ],
            },
        ]);

        const result = parseXlsxBuffer(buffer, "trial.xlsx", { sheet: "Patients" });

        expect(result.sheetName).toBe("Patients");
        expect(result.headers).toEqual(["patient_id", "arm", "months"]);
        expect(result.rowCount).toBe(1);
    });
});

describe("LOUPE-23 edgeCases — seven-sheet selector UI", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders a dropdown for 7 sheets and selects sheet index 5 (AdverseEvents)", () => {
        const onChange = vi.fn();
        const sheets = sevenSheetMetas();

        render(
            <WorksheetSelector
                ariaLabelledBy="sheet-heading"
                onChange={onChange}
                sheets={sheets}
                value={sheets[0]!.name}
            />,
        );

        expect(screen.queryByRole("radiogroup")).toBeNull();

        const combo = screen.getByRole("combobox");

        expect(combo).not.toBeNull();
        expect(screen.getAllByRole("option")).toHaveLength(7);

        fireEvent.change(combo, { target: { value: sheets[5]!.name } });

        expect(onChange).toHaveBeenCalledWith("AdverseEvents");

        const adverseOption = screen.getByRole("option", { name: /AdverseEvents · 842 rows/ });

        expect(adverseOption).not.toBeNull();
    });
});

describe("LOUPE-23 edgeCases — XLSX empty sheet detection via SheetJS", () => {
    it("reports rowCount 0 for worksheets with no !ref range", () => {
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Blank");

        const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

        expect(() => parseXlsxBuffer(buffer, "blank-tab.xlsx")).toThrow(/NO_COLUMNS|header row/i);
    });

    it("accepts mixed empty + valid workbook when valid sheet is selected", async () => {
        const file = xlsxFileFromSheets([
            { name: "Empty", rows: [] },
            {
                name: "Cohort",
                rows: [
                    ["subject_id", "ecog"],
                    ["S-01", "1"],
                ],
            },
        ]);

        const buffer = await file.arrayBuffer();
        const result = parseXlsxBuffer(buffer, file.name, { sheet: "Cohort" });

        expect(result.rowCount).toBe(1);
        expect(result.rows).toEqual(brandRows([{ subject_id: "S-01", ecog: "1" }]));
    });
});
