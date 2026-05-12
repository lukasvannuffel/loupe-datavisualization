// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { act, renderHook, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readXlsxWorkbook, sheetMetasFromWorkbook } from "../parseXlsx";
import { useFileParser } from "../useFileParser";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

const fixtureBuffer = (name: string): ArrayBuffer => {
    const nodeBuffer = readFileSync(path.join(fixturesDir, name));

    return nodeBuffer.buffer.slice(
        nodeBuffer.byteOffset,
        nodeBuffer.byteOffset + nodeBuffer.byteLength,
    );
};

const fixtureFile = (name: string): File => {
    const buffer = fixtureBuffer(name);

    return new File([buffer], name, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
};

describe("xlsx multi-sheet", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("lists sheets with names and row counts without calling sheet_to_json", async () => {
        const sheetToJson = vi.spyOn(XLSX.utils, "sheet_to_json");
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(fixtureFile("three-sheets.xlsx"));
        });

        expect(sheetToJson).not.toHaveBeenCalled();

        await waitFor(() => {
            expect(result.current.state.status).toBe("needs_sheet_selection");
        });

        if (result.current.state.status !== "needs_sheet_selection") {
            throw new Error("expected needs_sheet_selection");
        }

        const expected = sheetMetasFromWorkbook(
            readXlsxWorkbook(fixtureBuffer("three-sheets.xlsx")),
        );

        expect(result.current.state.sheets).toEqual(expected);
    });

    it("parses a single-sheet workbook immediately (no sheet selection)", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(fixtureFile("one-sheet.xlsx"));
        });

        await waitFor(() => {
            expect(result.current.state.status).toBe("success");
        });

        if (result.current.state.status !== "success") {
            throw new Error("expected success");
        }

        expect(result.current.state.result.headers).toEqual(["x", "y"]);
        expect(result.current.state.result.sheetName).toBe("Only");
    });

    it("throws EmptyWorkbookError when every sheet is empty", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(fixtureFile("three-empty.xlsx"));
        });

        await waitFor(() => {
            expect(result.current.state.status).toBe("error");
        });

        if (result.current.state.status !== "error") {
            throw new Error("expected error");
        }

        expect(result.current.state.error.code).toBe("EMPTY_WORKBOOK");
    });

    it("requires sheet selection when some sheets are empty and others have data (empties keep rowCount 0)", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(fixtureFile("mixed-empty-valid.xlsx"));
        });

        await waitFor(() => {
            expect(result.current.state.status).toBe("needs_sheet_selection");
        });

        if (result.current.state.status !== "needs_sheet_selection") {
            throw new Error("expected needs_sheet_selection");
        }

        const byName = new Map(result.current.state.sheets.map((meta) => [meta.name, meta]));

        expect(byName.get("Empty")).toEqual({ name: "Empty", rowCount: 0 });
        expect(byName.get("DataA")).toEqual({ name: "DataA", rowCount: 2 });
        expect(byName.get("DataB")).toEqual({ name: "DataB", rowCount: 2 });
    });

    it("parseSheet loads the chosen worksheet", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(fixtureFile("three-sheets.xlsx"));
        });

        await waitFor(() => {
            expect(result.current.state.status).toBe("needs_sheet_selection");
        });

        await act(async () => {
            await result.current.parseSheet("Sheet2");
        });

        await waitFor(() => {
            expect(result.current.state.status).toBe("success");
        });

        if (result.current.state.status !== "success") {
            throw new Error("expected success");
        }

        expect(result.current.state.result.sheetName).toBe("Sheet2");
        expect(result.current.state.result.headers).toEqual(["a"]);
        expect(result.current.state.result.rows).toHaveLength(1);
    });

    it("does not call fetch or XHR during CSV or XLSX parsing (privacy)", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response("", { status: 200 }),
        );
        const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open");

        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(
                new File(["h1,h2\n1,2"], "t.csv", { type: "text/csv" }),
            );
        });

        await act(async () => {
            await result.current.parse(fixtureFile("one-sheet.xlsx"));
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(xhrSpy).not.toHaveBeenCalled();
    });
});
