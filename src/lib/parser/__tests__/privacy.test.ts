import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import * as XLSX from "xlsx";

import { parseCsv } from "../parseCsv";
import { parseXlsxBuffer } from "../parseXlsx";
import type { PrivateRows } from "../types";

const csvFile = (text: string): File => new File([text], "x.csv", { type: "text/csv" });

const buildWorkbook = (): ArrayBuffer => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["a", "b"], [1, 2]]), "S");

    return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
};

// This suite verifies that no MAIN-realm network primitives are touched during
// parsing. Inside Papa's blob worker we cannot install spies from here, but
// Papa's worker source is parsing-only by design (papaparse.js — no fetch /
// XHR / importScripts of network code). For belt-and-braces, we also assert
// no Worker constructor calls during parseXlsxBuffer (it is a pure function),
// and document that CSV may legitimately construct a Papa Worker in browsers.
describe("privacy — no main-realm network", () => {
    let fetchSpy: ReturnType<typeof vi.fn>;
    let xhrSpy: ReturnType<typeof vi.fn>;
    let beaconSpy: ReturnType<typeof vi.fn>;
    const originalFetch = globalThis.fetch;
    const originalXHR = globalThis.XMLHttpRequest;
    const originalBeacon = (globalThis.navigator ?? {}).sendBeacon?.bind(globalThis.navigator);

    beforeEach(() => {
        fetchSpy = vi.fn(() => {
            throw new Error("fetch must not be called during local parsing");
        });
        xhrSpy = vi.fn(() => {
            throw new Error("XMLHttpRequest must not be called during local parsing");
        });
        beaconSpy = vi.fn(() => {
            throw new Error("sendBeacon must not be called during local parsing");
        });
        globalThis.fetch = fetchSpy as unknown as typeof fetch;
        (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = xhrSpy;
        if (globalThis.navigator !== undefined) {
            (globalThis.navigator as unknown as { sendBeacon: unknown }).sendBeacon = beaconSpy;
        }
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = originalXHR;
        if (globalThis.navigator !== undefined && originalBeacon !== undefined) {
            (globalThis.navigator as unknown as { sendBeacon: unknown }).sendBeacon = originalBeacon;
        }
    });

    it("does not call fetch / XHR / sendBeacon during CSV parsing", async () => {
        await parseCsv(csvFile("a,b\n1,2\n3,4"));

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(xhrSpy).not.toHaveBeenCalled();
        expect(beaconSpy).not.toHaveBeenCalled();
    });

    it("does not call fetch / XHR / sendBeacon and never constructs a Worker during XLSX parsing", () => {
        const workerSpy = vi.fn();
        const originalWorker = (globalThis as { Worker?: unknown }).Worker;
        (globalThis as unknown as { Worker: unknown }).Worker = workerSpy;

        try {
            parseXlsxBuffer(buildWorkbook(), "x.xlsx");
        } finally {
            (globalThis as unknown as { Worker: unknown }).Worker = originalWorker;
        }

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(xhrSpy).not.toHaveBeenCalled();
        expect(beaconSpy).not.toHaveBeenCalled();
        expect(workerSpy).not.toHaveBeenCalled();
    });

    it("brands PrivateRows distinctly from a plain row array", () => {
        expectTypeOf<PrivateRows>().not.toEqualTypeOf<ReadonlyArray<Readonly<Record<string, string>>>>();
    });
});
