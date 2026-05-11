// Uses the community-maintained `xlsx` package on npm. The official SheetJS CDN
// build (`https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`) is also valid;
// kept on npm here for CI simplicity.
import * as XLSX from "xlsx";

import { makeParseError } from "./errors";
import { dedupeHeaders } from "./headers";
import { brandRows, type ParseResult } from "./types";

const isBlank = (value: unknown): boolean => {
    return value === undefined || value === null || String(value).trim() === "";
};

export const parseXlsxBuffer = (buffer: ArrayBuffer, fileName: string): ParseResult => {
    if (buffer.byteLength === 0) {
        throw makeParseError("FILE_EMPTY");
    }

    let workbook: XLSX.WorkBook;
    try {
        workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
    } catch (error) {
        throw makeParseError("CORRUPT", error);
    }

    const sheetName = workbook.SheetNames[0];
    if (sheetName === undefined) {
        throw makeParseError("NO_COLUMNS");
    }

    const sheet = workbook.Sheets[sheetName];
    if (sheet === undefined) {
        throw makeParseError("NO_COLUMNS");
    }

    // With `cellDates: false, raw: false`, dates round-trip as locale-formatted
    // strings (e.g. "1/15/24") — LOUPE-03 owns inference and will need to know.
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
        sizeBytes: buffer.byteLength,
        sourceFormat: "xlsx",
    };
};
