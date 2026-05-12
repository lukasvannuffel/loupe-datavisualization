import type { ParseError, ParseErrorCode } from "./types";

export class EmptyWorkbookError extends Error {
    public override readonly name = "EmptyWorkbookError";

    public constructor(message?: string) {
        super(
            message ??
                "Every worksheet in this file is empty. Add a sheet with a header row or pick another file.",
        );
    }
}

const MESSAGES: Readonly<Record<ParseErrorCode, string>> = {
    FILE_TOO_LARGE: "That file is over 50 MB. Trim it locally first — Loupe never uploads rows.",
    FILE_EMPTY: "That file is empty. Open it locally and confirm it has a header row.",
    EMPTY_WORKBOOK:
        "Every worksheet in this file is empty. Add a sheet with a header row or pick another file.",
    NO_COLUMNS: "No columns found in the first row. Loupe expects a header row.",
    UNSUPPORTED_FORMAT: "Loupe reads .csv and .xlsx files. Save your file in one of those formats.",
    ENCODING_UNSUPPORTED: "Save the file as UTF-8 and try again. Loupe doesn't auto-detect other encodings.",
    CORRUPT: "Loupe couldn't read this file. It may be corrupted or partially written.",
    ABORTED: "Parsing was cancelled.",
};

export const makeParseError = (code: ParseErrorCode, cause?: unknown): ParseError => {
    return { code, message: MESSAGES[code], cause };
};

export const toParseError = (error: unknown): ParseError => {
    if (error instanceof EmptyWorkbookError) {
        return makeParseError("EMPTY_WORKBOOK", error);
    }

    if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
        const candidate = error as { code: unknown; message: unknown };
        if (typeof candidate.code === "string" && typeof candidate.message === "string") {
            return error as ParseError;
        }
    }

    return makeParseError("CORRUPT", error);
};
