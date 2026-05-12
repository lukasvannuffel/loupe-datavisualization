/// <reference lib="webworker" />

import { EmptyWorkbookError, toParseError } from "./errors";
import {
    everySheetEmpty,
    parseWorkbookToResult,
    readXlsxWorkbook,
    sheetMetasFromWorkbook,
} from "./parseXlsx";
import type { WorkerRequest, WorkerResponse } from "./types";

declare const self: DedicatedWorkerGlobalScope;

export const handleMessage = (
    event: MessageEvent<WorkerRequest>,
    post: (msg: WorkerResponse) => void,
): void => {
    const { buffer, fileName, sheetName } = event.data;

    try {
        const workbook = readXlsxWorkbook(buffer);

        if (sheetName !== undefined) {
            post({
                ok: true,
                kind: "parsed",
                result: parseWorkbookToResult(workbook, fileName, buffer.byteLength, sheetName),
            });

            return;
        }

        if (workbook.SheetNames.length === 1) {
            post({
                ok: true,
                kind: "parsed",
                result: parseWorkbookToResult(workbook, fileName, buffer.byteLength),
            });

            return;
        }

        const metas = sheetMetasFromWorkbook(workbook);

        if (everySheetEmpty(metas)) {
            throw new EmptyWorkbookError();
        }

        post({
            ok: true,
            kind: "needs_sheet",
            sheets: metas,
            fileName,
            sizeBytes: buffer.byteLength,
        });
    } catch (error) {
        post({ ok: false, error: toParseError(error) });
    }
};

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
    self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
        handleMessage(event, (msg) => self.postMessage(msg));
    });
}
