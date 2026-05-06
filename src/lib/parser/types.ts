export type SourceFormat = "csv" | "xlsx";

export const MAX_FILE_BYTES: number = 50 * 1024 * 1024;
export const WORKER_THRESHOLD_BYTES: number = 5 * 1024 * 1024;

export type PrivateRows = ReadonlyArray<Readonly<Record<string, string>>> & {
    readonly __brand: "PrivateRows";
};

export const brandRows = (
    rows: ReadonlyArray<Readonly<Record<string, string>>>,
): PrivateRows => {
    return rows as PrivateRows;
};

export type ParseResult = {
    headers: readonly string[];
    rows: PrivateRows;
    rowCount: number;
    fileName: string;
    sizeBytes: number;
    sourceFormat: SourceFormat;
};

export type ParseErrorCode =
    | "FILE_TOO_LARGE"
    | "FILE_EMPTY"
    | "NO_COLUMNS"
    | "UNSUPPORTED_FORMAT"
    | "ENCODING_UNSUPPORTED"
    | "CORRUPT"
    | "ABORTED";

export type ParseError = {
    code: ParseErrorCode;
    message: string;
    cause?: unknown;
};

export type ParseState =
    | { status: "idle" }
    | { status: "parsing"; progress?: number }
    | { status: "success"; result: ParseResult }
    | { status: "error"; error: ParseError };

export type WorkerRequest = {
    buffer: ArrayBuffer;
    fileName: string;
};

export type WorkerResponse =
    | { ok: true; result: ParseResult }
    | { ok: false; error: ParseError };
