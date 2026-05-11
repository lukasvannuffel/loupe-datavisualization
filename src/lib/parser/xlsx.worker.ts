/// <reference lib="webworker" />

import { toParseError } from "./errors";
import { parseXlsxBuffer } from "./parseXlsx";
import type { WorkerRequest, WorkerResponse } from "./types";

declare const self: DedicatedWorkerGlobalScope;

export const handleMessage = (
    event: MessageEvent<WorkerRequest>,
    post: (msg: WorkerResponse) => void,
): void => {
    const { buffer, fileName } = event.data;
    try {
        const result = parseXlsxBuffer(buffer, fileName);
        post({ ok: true, result });
    } catch (error) {
        post({ ok: false, error: toParseError(error) });
    }
};

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
    self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
        handleMessage(event, (msg) => self.postMessage(msg));
    });
}
