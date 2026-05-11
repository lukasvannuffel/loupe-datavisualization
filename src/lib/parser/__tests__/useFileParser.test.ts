// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MAX_FILE_BYTES, WORKER_THRESHOLD_BYTES, type ParseState } from "../types";
import { useFileParser } from "../useFileParser";

const csvFile = (text: string, name = "x.csv"): File => {
    return new File([text], name, { type: "text/csv" });
};

describe("useFileParser", () => {
    it("rejects a 0-byte file with FILE_EMPTY", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(csvFile("", "empty.csv"));
        });

        expect(result.current.state).toEqual({
            status: "error",
            error: expect.objectContaining({ code: "FILE_EMPTY" }),
        });
    });

    it("rejects a >50 MB file with FILE_TOO_LARGE without parsing", async () => {
        const { result } = renderHook(() => useFileParser());
        const file = csvFile("a,b\n1,2", "big.csv");
        Object.defineProperty(file, "size", { value: MAX_FILE_BYTES + 1 });

        await act(async () => {
            await result.current.parse(file);
        });

        expect(result.current.state).toEqual({
            status: "error",
            error: expect.objectContaining({ code: "FILE_TOO_LARGE" }),
        });
    });

    it("rejects unsupported extensions with UNSUPPORTED_FORMAT", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(new File(["hi"], "notes.txt", { type: "text/plain" }));
        });

        expect(result.current.state).toEqual({
            status: "error",
            error: expect.objectContaining({ code: "UNSUPPORTED_FORMAT" }),
        });
    });

    it("treats a folder drop (0-byte file with no extension) as UNSUPPORTED_FORMAT, not FILE_EMPTY", async () => {
        const { result } = renderHook(() => useFileParser());
        const folder = new File([], "MyFolder", { type: "" });

        await act(async () => {
            await result.current.parse(folder);
        });

        expect(result.current.state).toEqual({
            status: "error",
            error: expect.objectContaining({ code: "UNSUPPORTED_FORMAT" }),
        });
    });

    it("drops every stale state from the first parse when a second parse is started", async () => {
        const seen: ParseState[] = [];
        const { result } = renderHook(() => {
            const hook = useFileParser();
            seen.push(hook.state);

            return hook;
        });

        await act(async () => {
            const first = result.current.parse(csvFile("a,b\n1,2", "first.csv"));
            const second = result.current.parse(csvFile("x,y,z\n1,2,3", "second.csv"));
            await Promise.all([first, second]);
        });

        await waitFor(() => {
            expect(result.current.state.status).toBe("success");
        });

        if (result.current.state.status !== "success") {
            throw new Error("expected success");
        }
        expect(result.current.state.result.fileName).toBe("second.csv");
        expect(result.current.state.result.headers).toEqual(["x", "y", "z"]);

        const firstObserved = seen.find(
            (s) => s.status === "success" && s.result.fileName === "first.csv",
        );
        expect(firstObserved).toBeUndefined();
    });

    it("settles cleanly when an XLSX > WORKER_THRESHOLD_BYTES has no module-worker available", async () => {
        // happy-dom does not implement module workers; if the hook tried to
        // spawn one for files > WORKER_THRESHOLD_BYTES the construction would
        // throw. The fallback should route to parseXlsxBuffer on the main
        // thread — what we care about here is that the hook resolves to a
        // terminal state (success OR error) instead of stranding "parsing"
        // or surfacing the construction error as an unhandled exception.
        const { result } = renderHook(() => useFileParser());
        const big = new File([new Uint8Array(WORKER_THRESHOLD_BYTES + 1)], "big.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        await act(async () => {
            await result.current.parse(big);
        });

        expect(["success", "error"]).toContain(result.current.state.status);
    });

    it("reset() returns the hook to idle", async () => {
        const { result } = renderHook(() => useFileParser());

        await act(async () => {
            await result.current.parse(csvFile("a,b\n1,2"));
        });
        act(() => result.current.reset());

        expect(result.current.state).toEqual({ status: "idle" });
    });
});
