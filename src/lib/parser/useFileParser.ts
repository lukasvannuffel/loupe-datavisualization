"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyWorkbookError, makeParseError, toParseError } from "./errors";
import { parseCsv } from "./parseCsv";
import {
    everySheetEmpty,
    parseWorkbookToResult,
    parseXlsxBuffer,
    readXlsxWorkbook,
    sheetMetasFromWorkbook,
    type XlsxWorkbook,
} from "./parseXlsx";
import {
    MAX_FILE_BYTES,
    WORKER_THRESHOLD_BYTES,
    type ParseResult,
    type ParseState,
    type SheetMeta,
    type WorkerResponse,
} from "./types";

type PendingXlsx = {
    file: File;
    workbook?: XlsxWorkbook;
};

type XlsxFirstPass =
    | { kind: "parsed"; result: ParseResult }
    | { kind: "needs_sheet"; sheets: readonly SheetMeta[]; workbook?: XlsxWorkbook };

const extensionOf = (fileName: string): string => {
    const dot = fileName.lastIndexOf(".");

    return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
};

const parseXlsxFirstPassMain = (buffer: ArrayBuffer, file: File): XlsxFirstPass => {
    const workbook = readXlsxWorkbook(buffer);
    const metas = sheetMetasFromWorkbook(workbook);

    if (workbook.SheetNames.length === 1) {
        return {
            kind: "parsed",
            result: parseWorkbookToResult(workbook, file.name, buffer.byteLength),
        };
    }

    if (everySheetEmpty(metas)) {
        throw new EmptyWorkbookError();
    }

    return {
        kind: "needs_sheet",
        sheets: metas,
        workbook,
    };
};

const parseXlsxFirstPassFromFile = async (file: File): Promise<XlsxFirstPass> => {
    const buffer = await file.arrayBuffer();

    return parseXlsxFirstPassMain(buffer, file);
};

const runXlsxInWorkerFirstPass = (file: File, signal: AbortSignal): Promise<XlsxFirstPass> => {
    if (typeof Worker === "undefined") {
        return parseXlsxFirstPassFromFile(file);
    }

    return new Promise<XlsxFirstPass>((resolve, reject) => {
        let worker: Worker;

        try {
            worker = new Worker(new URL("./xlsx.worker.ts", import.meta.url), {
                type: "module",
            });
        } catch {
            parseXlsxFirstPassFromFile(file).then(resolve, reject);

            return;
        }

        let settled = false;

        const settle = (cb: () => void): void => {
            if (settled) {
                return;
            }

            settled = true;
            signal.removeEventListener("abort", onAbort);
            cb();
            worker.terminate();
        };

        const onAbort = (): void => {
            settle(() => reject(makeParseError("ABORTED")));
        };

        if (signal.aborted) {
            settle(() => reject(makeParseError("ABORTED")));

            return;
        }

        signal.addEventListener("abort", onAbort, { once: true });

        worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
            settle(() => {
                if (event.data.ok) {
                    if (event.data.kind === "parsed") {
                        resolve({ kind: "parsed", result: event.data.result });

                        return;
                    }

                    resolve({
                        kind: "needs_sheet",
                        sheets: event.data.sheets,
                    });

                    return;
                }

                reject(event.data.error);
            });
        });

        worker.addEventListener("error", (event) => {
            settle(() => reject(toParseError(event.message ?? event)));
        });

        file.arrayBuffer()
            .then((buffer) => {
                if (settled) {
                    return;
                }

                worker.postMessage({ buffer, fileName: file.name }, [buffer]);
            })
            .catch((error: unknown) => {
                settle(() => reject(toParseError(error)));
            });
    });
};

const parseXlsxSheetFromFileMain = async (file: File, sheetName: string): Promise<ParseResult> => {
    return parseXlsxBuffer(await file.arrayBuffer(), file.name, { sheet: sheetName });
};

const runXlsxInWorkerSheet = (file: File, sheetName: string, signal: AbortSignal): Promise<ParseResult> => {
    if (typeof Worker === "undefined") {
        return parseXlsxSheetFromFileMain(file, sheetName);
    }

    return new Promise<ParseResult>((resolve, reject) => {
        let worker: Worker;

        try {
            worker = new Worker(new URL("./xlsx.worker.ts", import.meta.url), {
                type: "module",
            });
        } catch {
            parseXlsxSheetFromFileMain(file, sheetName).then(resolve, reject);

            return;
        }

        let settled = false;

        const settle = (cb: () => void): void => {
            if (settled) {
                return;
            }

            settled = true;
            signal.removeEventListener("abort", onAbort);
            cb();
            worker.terminate();
        };

        const onAbort = (): void => {
            settle(() => reject(makeParseError("ABORTED")));
        };

        if (signal.aborted) {
            settle(() => reject(makeParseError("ABORTED")));

            return;
        }

        signal.addEventListener("abort", onAbort, { once: true });

        worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
            settle(() => {
                if (event.data.ok && event.data.kind === "parsed") {
                    resolve(event.data.result);

                    return;
                }

                if (!event.data.ok) {
                    reject(event.data.error);

                    return;
                }

                reject(makeParseError("CORRUPT"));
            });
        });

        worker.addEventListener("error", (event) => {
            settle(() => reject(toParseError(event.message ?? event)));
        });

        file.arrayBuffer()
            .then((buffer) => {
                if (settled) {
                    return;
                }

                worker.postMessage({ buffer, fileName: file.name, sheetName }, [buffer]);
            })
            .catch((error: unknown) => {
                settle(() => reject(toParseError(error)));
            });
    });
};

export type UseFileParser = {
    canReturnToSheetPicker: boolean;
    parse: (file: File) => Promise<void>;
    parseSheet: (sheetName: string) => Promise<void>;
    reset: () => void;
    returnToSheetSelection: () => Promise<void>;
    state: ParseState;
};

export const useFileParser = (): UseFileParser => {
    const [state, setState] = useState<ParseState>({ status: "idle" });
    const [canReturnToSheetPicker, setCanReturnToSheetPicker] = useState<boolean>(false);
    const abortRef = useRef<AbortController | null>(null);
    const pendingRef = useRef<PendingXlsx | null>(null);
    const multiSheetFileRef = useRef<File | null>(null);
    const tokenRef = useRef<number>(0);

    const cancel = useCallback((): void => {
        tokenRef.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
    }, []);

    const reset = useCallback((): void => {
        cancel();
        pendingRef.current = null;
        multiSheetFileRef.current = null;
        setCanReturnToSheetPicker(false);
        setState({ status: "idle" });
    }, [cancel]);

    const parse = useCallback(async (file: File): Promise<void> => {
        cancel();
        pendingRef.current = null;
        multiSheetFileRef.current = null;
        setCanReturnToSheetPicker(false);
        const token = tokenRef.current;
        const controller = new AbortController();
        abortRef.current = controller;
        const { signal } = controller;

        const isCurrent = (): boolean => token === tokenRef.current && !signal.aborted;

        const commit = (next: ParseState): void => {
            if (isCurrent()) {
                setState(next);
            }
        };

        const extension = extensionOf(file.name);

        if (extension !== ".csv" && extension !== ".xlsx") {
            commit({ status: "error", error: makeParseError("UNSUPPORTED_FORMAT") });

            return;
        }

        if (file.size === 0) {
            commit({ status: "error", error: makeParseError("FILE_EMPTY") });

            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            commit({ status: "error", error: makeParseError("FILE_TOO_LARGE") });

            return;
        }

        commit({ status: "parsing" });

        try {
            if (extension === ".csv") {
                const result = await parseCsv(file);

                multiSheetFileRef.current = null;
                setCanReturnToSheetPicker(false);
                commit({ status: "success", result });

                return;
            }

            if (file.size > WORKER_THRESHOLD_BYTES) {
                const pass = await runXlsxInWorkerFirstPass(file, signal);

                if (!isCurrent()) {
                    return;
                }

                if (pass.kind === "parsed") {
                    multiSheetFileRef.current = null;
                    setCanReturnToSheetPicker(false);
                    commit({ status: "success", result: pass.result });

                    return;
                }

                multiSheetFileRef.current = file;
                setCanReturnToSheetPicker(true);
                pendingRef.current = { file };
                commit({
                    status: "needs_sheet_selection",
                    sheets: pass.sheets,
                    fileName: file.name,
                    sizeBytes: file.size,
                });

                return;
            }

            const buffer = await file.arrayBuffer();
            const pass = parseXlsxFirstPassMain(buffer, file);

            if (!isCurrent()) {
                return;
            }

            if (pass.kind === "parsed") {
                multiSheetFileRef.current = null;
                setCanReturnToSheetPicker(false);
                commit({ status: "success", result: pass.result });

                return;
            }

            multiSheetFileRef.current = file;
            setCanReturnToSheetPicker(true);
            pendingRef.current = {
                file,
                workbook: pass.workbook,
            };

            commit({
                status: "needs_sheet_selection",
                sheets: pass.sheets,
                fileName: file.name,
                sizeBytes: file.size,
            });
        } catch (error) {
            commit({ status: "error", error: toParseError(error) });
        }
    }, [cancel]);

    const parseSheet = useCallback(async (sheetName: string): Promise<void> => {
        const pending = pendingRef.current;

        if (pending === null) {
            return;
        }

        cancel();

        const token = tokenRef.current;
        const controller = new AbortController();
        abortRef.current = controller;
        const { signal } = controller;

        const isCurrent = (): boolean => token === tokenRef.current && !signal.aborted;

        const commit = (next: ParseState): void => {
            if (isCurrent()) {
                setState(next);
            }
        };

        commit({ status: "parsing" });

        try {
            let result: ParseResult;

            if (pending.workbook !== undefined) {
                result = parseWorkbookToResult(
                    pending.workbook,
                    pending.file.name,
                    pending.file.size,
                    sheetName,
                );
            } else if (pending.file.size > WORKER_THRESHOLD_BYTES) {
                result = await runXlsxInWorkerSheet(pending.file, sheetName, signal);
            } else {
                result = parseXlsxBuffer(await pending.file.arrayBuffer(), pending.file.name, {
                    sheet: sheetName,
                });
            }

            if (!isCurrent()) {
                return;
            }

            pendingRef.current = null;
            setCanReturnToSheetPicker(true);
            commit({ status: "success", result });
        } catch (error) {
            commit({ status: "error", error: toParseError(error) });
        }
    }, [cancel]);

    const returnToSheetSelection = useCallback(async (): Promise<void> => {
        const file = multiSheetFileRef.current;

        if (file === null) {
            return;
        }

        cancel();

        const token = tokenRef.current;
        const controller = new AbortController();
        abortRef.current = controller;
        const { signal } = controller;

        const isCurrent = (): boolean => token === tokenRef.current && !signal.aborted;

        const commit = (next: ParseState): void => {
            if (isCurrent()) {
                setState(next);
            }
        };

        commit({ status: "parsing" });

        try {
            const buffer = await file.arrayBuffer();
            const workbook = readXlsxWorkbook(buffer);
            const metas = sheetMetasFromWorkbook(workbook);

            if (everySheetEmpty(metas)) {
                throw new EmptyWorkbookError();
            }

            if (!isCurrent()) {
                return;
            }

            if (file.size > WORKER_THRESHOLD_BYTES) {
                pendingRef.current = { file };
            } else {
                pendingRef.current = {
                    file,
                    workbook,
                };
            }

            setCanReturnToSheetPicker(true);
            commit({
                status: "needs_sheet_selection",
                sheets: metas,
                fileName: file.name,
                sizeBytes: file.size,
            });
        } catch (error) {
            commit({ status: "error", error: toParseError(error) });
        }
    }, [cancel]);

    useEffect(() => {
        return cancel;
    }, [cancel]);

    return {
        canReturnToSheetPicker,
        parse,
        parseSheet,
        reset,
        returnToSheetSelection,
        state,
    };
};
