import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseXlsxBuffer } from "../parseXlsx";

const buildWorkbook = (rows: readonly (readonly unknown[])[]): ArrayBuffer => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows.map((r) => [...r]));
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    return out;
};

describe("parseXlsxBuffer", () => {
    it("reads headers and rows identical to a CSV with the same data", () => {
        const buffer = buildWorkbook([
            ["a", "b", "c", "d"],
            [1, 2, 3, 4],
            [5, 6, 7, 8],
        ]);

        const result = parseXlsxBuffer(buffer, "x.xlsx");

        expect(result.headers).toEqual(["a", "b", "c", "d"]);
        expect(result.rowCount).toBe(2);
        expect(result.sourceFormat).toBe("xlsx");
        expect(result.fileName).toBe("x.xlsx");
    });

    it("throws NO_COLUMNS when the header row is empty", () => {
        const buffer = buildWorkbook([[]]);

        expect(() => parseXlsxBuffer(buffer, "empty.xlsx")).toThrow(
            expect.objectContaining({ code: "NO_COLUMNS" }),
        );
    });

    it("throws FILE_EMPTY for a 0-byte buffer", () => {
        expect(() => parseXlsxBuffer(new ArrayBuffer(0), "x.xlsx")).toThrow(
            expect.objectContaining({ code: "FILE_EMPTY" }),
        );
    });

    it("throws MULTI_TABLE_DETECTED for side-by-side tables in one sheet", () => {
        const buffer = buildWorkbook([
            ["PatientID", "Age", "Group", "", "SubjectID", "Score", "Arm"],
            [1, 45, "A", "", 101, 0.8, "Treatment"],
            [2, 50, "B", "", 102, 0.6, "Control"],
        ]);

        expect(() => parseXlsxBuffer(buffer, "multi.xlsx")).toThrow(
            expect.objectContaining({
                code: "MULTI_TABLE_DETECTED",
                cause: expect.objectContaining({
                    reason: "horizontal_split",
                }),
            }),
        );
    });

    it("does not flag trailing empty columns as multi-table", () => {
        const buffer = buildWorkbook([
            ["PatientID", "Age", "Group", "", "", ""],
            [1, 45, "A", "", "", ""],
            [2, 50, "B", "", "", ""],
        ]);

        const result = parseXlsxBuffer(buffer, "trailing.xlsx");
        expect(result.rowCount).toBe(2);
    });

    it("coerces numeric cells to strings", () => {
        const buffer = buildWorkbook([
            ["n"],
            [42],
            [3.14],
        ]);

        const result = parseXlsxBuffer(buffer, "n.xlsx");

        expect(result.rowCount).toBe(2);
        const inner = result.rows as ReadonlyArray<Readonly<Record<string, string>>>;
        expect(typeof inner[0]!.n).toBe("string");
        expect(inner[0]!.n).toBe("42");
        expect(inner[1]!.n).toBe("3.14");
    });

    it("renames duplicate headers without colliding with pre-existing suffixes", () => {
        const buffer = buildWorkbook([
            ["a", "a", "a_1"],
            [1, 2, 3],
        ]);

        const result = parseXlsxBuffer(buffer, "dupes.xlsx");

        expect(result.headers).toEqual(["a", "a_1", "a_1_1"]);
        const inner = result.rows as ReadonlyArray<Readonly<Record<string, string>>>;
        expect(inner[0]).toEqual({ a: "1", a_1: "2", a_1_1: "3" });
    });

    it("renames empty header cells to column_N", () => {
        const buffer = buildWorkbook([
            ["a", "", "c"],
            [1, 2, 3],
        ]);

        const result = parseXlsxBuffer(buffer, "blanks.xlsx");

        expect(result.headers).toEqual(["a", "column_2", "c"]);
    });
});
