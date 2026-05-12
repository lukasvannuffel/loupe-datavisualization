// Uses the community-maintained `xlsx` package on npm. The official SheetJS CDN
// build (`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`) is also valid;
// kept on npm here for CI simplicity.
import * as XLSX from "xlsx";

import { makeParseError } from "./errors";
import { dedupeHeaders } from "./headers";
import { brandRows, type ParseResult, type SheetMeta } from "./types";

export type XlsxWorkbook = XLSX.WorkBook;

const isBlank = (value: unknown): boolean => {
    return value === undefined || value === null || String(value).trim() === "";
};

export const readXlsxWorkbook = (buffer: ArrayBuffer): XlsxWorkbook => {
    if (buffer.byteLength === 0) {
        throw makeParseError("FILE_EMPTY");
    }

    try {
        return XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
    } catch (error) {
        throw makeParseError("CORRUPT", error);
    }
};

export const sheetMetasFromWorkbook = (workbook: XlsxWorkbook): readonly SheetMeta[] => {
    return workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const ref = sheet?.["!ref"];
        let rowCount = 0;

        if (ref !== undefined && ref !== "") {
            const bounds = XLSX.utils.decode_range(ref);

            rowCount = bounds.e.r - bounds.s.r + 1;
        }

        return { name, rowCount };
    });
};

export const everySheetEmpty = (metas: readonly SheetMeta[]): boolean => {
    return metas.every((meta) => meta.rowCount === 0);
};

export const parseWorkbookToResult = (
    workbook: XlsxWorkbook,
    fileName: string,
    sizeBytes: number,
    sheetName?: string,
): ParseResult => {
    const names = workbook.SheetNames;

    if (names.length === 0) {
        throw makeParseError("NO_COLUMNS");
    }

    let resolvedName: string;

    if (sheetName !== undefined) {
        const match = names.find((candidate) => candidate === sheetName);

        if (match === undefined) {
            throw makeParseError("CORRUPT");
        }

        resolvedName = match;
    } else {
        resolvedName = names[0]!;
    }

    const sheet = workbook.Sheets[resolvedName];

    if (sheet === undefined) {
        throw makeParseError("NO_COLUMNS");
    }

    const aoa = XLSX.utils.sheet_to_json<readonly unknown[]>(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
    });

    const headerRow = aoa[0];

    if (headerRow === undefined || headerRow.every(isBlank)) {
        throw makeParseError("NO_COLUMNS");
    }

    const headers = dedupeHeaders(headerRow.map((cell) => String(cell ?? "")));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < aoa.length; i++) {
        const row = aoa[i] ?? [];
        const record: Record<string, string> = {};

        for (let c = 0; c < headers.length; c++) {
            const cell = row[c];

            record[headers[c]!] = cell === undefined || cell === null ? "" : String(cell);
        }

        rows.push(record);
    }

    return {
        headers,
        rows: brandRows(rows),
        rowCount: rows.length,
        fileName,
        sizeBytes,
        sourceFormat: "xlsx",
        sheetName: resolvedName,
    };
};

export const parseXlsxBuffer = (
    buffer: ArrayBuffer,
    fileName: string,
    options?: { sheet?: string },
): ParseResult => {
    const workbook = readXlsxWorkbook(buffer);

    return parseWorkbookToResult(workbook, fileName, buffer.byteLength, options?.sheet);
};
