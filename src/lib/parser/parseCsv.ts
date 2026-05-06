import Papa, { type ParseResult as PapaResult } from "papaparse";

import { makeParseError } from "./errors";
import { dedupeHeaders } from "./headers";
import { brandRows, type ParseResult } from "./types";

const BOM = "﻿";

const stripBom = (value: string): string => {
    return value.startsWith(BOM) ? value.slice(1) : value;
};

const isEncodingError = (error: { message?: string }): boolean => {
    return /encoding|utf-?8|charset/i.test(error.message ?? "");
};

const decodeText = async (file: File): Promise<string> => {
    // Strict UTF-8: throw on invalid bytes instead of silently substituting U+FFFD.
    // We pre-decode here so the parser path is identical across browser & Node;
    // Papa with `worker: true` then posts the string into its blob worker
    // (papaparse.js#204-223), keeping parsing off the main thread in browsers.
    // No bytes ever leave the page — no disk, no network.
    let buffer: ArrayBuffer;
    try {
        buffer = await file.arrayBuffer();
    } catch (error) {
        throw makeParseError("CORRUPT", error);
    }

    try {
        const raw = new TextDecoder("utf-8", { fatal: true }).decode(buffer);

        return raw.replace(/\r\n?/g, "\n");
    } catch (error) {
        throw makeParseError("ENCODING_UNSUPPORTED", error);
    }
};

export const parseCsv = async (file: File): Promise<ParseResult> => {
    const text = await decodeText(file);

    return new Promise<ParseResult>((resolve, reject) => {
        Papa.parse<Record<string, string>>(text, {
            worker: true,
            header: true,
            dynamicTyping: false,
            skipEmptyLines: "greedy",
            complete: (papa: PapaResult<Record<string, string>>) => {
                const rawFields = papa.meta.fields ?? [];
                const stripped = rawFields.map((name, index) =>
                    index === 0 ? stripBom(name) : name,
                );

                if (stripped.length === 0 || stripped.every((f) => f === "")) {
                    reject(makeParseError("NO_COLUMNS"));

                    return;
                }

                const hasData = papa.data.length > 0;
                const fatal = papa.errors.find((e) => {
                    if (e.type === "FieldMismatch") {
                        return false;
                    }
                    if (e.code === "UndetectableDelimiter" && hasData) {
                        return false;
                    }

                    return true;
                });
                if (fatal !== undefined) {
                    reject(
                        isEncodingError(fatal)
                            ? makeParseError("ENCODING_UNSUPPORTED", fatal)
                            : makeParseError("CORRUPT", fatal),
                    );

                    return;
                }

                const headers = dedupeHeaders(stripped);
                const rows = papa.data.map((row) => {
                    const next: Record<string, string> = {};
                    rawFields.forEach((rawKey, i) => {
                        next[headers[i]!] = row[rawKey] ?? "";
                    });

                    return next;
                });

                resolve({
                    headers,
                    rows: brandRows(rows),
                    rowCount: rows.length,
                    fileName: file.name,
                    sizeBytes: file.size,
                    sourceFormat: "csv",
                });
            },
            error: (error: Error) => {
                reject(
                    isEncodingError(error)
                        ? makeParseError("ENCODING_UNSUPPORTED", error)
                        : makeParseError("CORRUPT", error),
                );
            },
        });
    });
};
