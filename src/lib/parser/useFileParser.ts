"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { makeParseError, toParseError } from "./errors";
import { parseCsv } from "./parseCsv";
import { parseXlsxBuffer } from "./parseXlsx";
import {
    MAX_FILE_BYTES,
    WORKER_THRESHOLD_BYTES,
    type ParseResult,
    type ParseState,
    type WorkerResponse,
} from "./types";

const extensionOf = (fileName: string): string => {
    const dot = fileName.lastIndexOf(".");

    return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
};

const parseXlsxOnMainThread = async (file: File): Promise<ParseResult> => {
    return parseXlsxBuffer(await file.arrayBuffer(), file.name);
};

const parseXlsxInWorker = (file: File, signal: AbortSignal): Promise<ParseResult> => {
    if (typeof Worker === "undefined") {
        return parseXlsxOnMainThread(file);
    }

    return new Promise<ParseResult>((resolve, reject) => {
        let worker: Worker;
        try {
            worker = new Worker(new URL("./xlsx.worker.ts", import.meta.url), {
                type: "module",
            });
        } catch {
            // Module-worker construction can fail on older runtimes or on a
            // bundler URL drift. Falling back to the main thread is correct
            // because every file here is < MAX_FILE_BYTES and parses safely.
            parseXlsxOnMainThread(file).then(resolve, reject);

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
                    resolve(event.data.result);
                } else {
                    reject(event.data.error);
                }
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

export type UseFileParser = {
    state: ParseState;
    parse: (file: File) => Promise<void>;
    reset: () => void;
};

export const useFileParser = (): UseFileParser => {
    const [state, setState] = useState<ParseState>({ status: "idle" });
    const abortRef = useRef<AbortController | null>(null);
    const tokenRef = useRef<number>(0);

    const cancel = useCallback((): void => {
        tokenRef.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
    }, []);

    const reset = useCallback((): void => {
        cancel();
        setState({ status: "idle" });
    }, [cancel]);

    const parse = useCallback(async (file: File): Promise<void> => {
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

        // Extension check first — a folder dropped on Chrome surfaces a 0-byte
        // File with an empty name; reordering keeps that case under
        // UNSUPPORTED_FORMAT instead of misleading the user with FILE_EMPTY.
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
            let result: ParseResult;
            if (extension === ".csv") {
                result = await parseCsv(file);
            } else if (file.size > WORKER_THRESHOLD_BYTES) {
                result = await parseXlsxInWorker(file, signal);
            } else {
                result = parseXlsxBuffer(await file.arrayBuffer(), file.name);
            }

            commit({ status: "success", result });
        } catch (error) {
            commit({ status: "error", error: toParseError(error) });
        }
    }, [cancel]);

    useEffect(() => {
        return cancel;
    }, [cancel]);

    return { state, parse, reset };
};
