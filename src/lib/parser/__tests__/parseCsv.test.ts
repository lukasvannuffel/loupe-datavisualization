import { describe, expect, it } from "vitest";

import { parseCsv } from "../parseCsv";

const fileFromText = (text: string, name = "x.csv"): File => {
    return new File([text], name, { type: "text/csv" });
};

describe("parseCsv", () => {
    it("parses 10,000 rows × 4 columns under the perf budget", async () => {
        const header = "a,b,c,d";
        const row = "1,2,3,4";
        const lines: string[] = [header];
        for (let i = 0; i < 10000; i++) {
            lines.push(row);
        }
        const file = fileFromText(lines.join("\n"), "big.csv");

        const start = Date.now();
        const result = await parseCsv(file);
        const elapsed = Date.now() - start;

        expect(result.rowCount).toBe(10000);
        expect(result.headers).toEqual(["a", "b", "c", "d"]);
        expect(result.sourceFormat).toBe("csv");
        expect(result.fileName).toBe("big.csv");
        expect(elapsed).toBeLessThan(2000);
    }, 10000);

    it("strips a UTF-8 BOM from the first header", async () => {
        const file = fileFromText("﻿a,b\n1,2");

        const result = await parseCsv(file);

        expect(result.headers).toEqual(["a", "b"]);
        expect(result.rowCount).toBe(1);
    });

    it("handles mixed CRLF and LF line endings", async () => {
        const file = fileFromText("a,b\r\n1,2\n3,4\r\n5,6");

        const result = await parseCsv(file);

        expect(result.headers).toEqual(["a", "b"]);
        expect(result.rowCount).toBe(3);
    });

    it("rejects with NO_COLUMNS when there is no header row", async () => {
        const file = fileFromText("");

        await expect(parseCsv(file)).rejects.toMatchObject({ code: "NO_COLUMNS" });
    });

    it("parses a single-column file", async () => {
        const file = fileFromText("only\n1\n2\n3");

        const result = await parseCsv(file);

        expect(result.headers).toEqual(["only"]);
        expect(result.rowCount).toBe(3);
    });
});
