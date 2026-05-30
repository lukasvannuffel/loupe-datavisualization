// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "../copyToClipboard";

describe("copyToClipboard", () => {
    const originalClipboard = navigator.clipboard;
    const originalExecCommand = document.execCommand;

    beforeEach(() => {
        vi.restoreAllMocks();
        document.execCommand = vi.fn(() => true);
    });

    afterEach(() => {
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: originalClipboard,
        });
        document.execCommand = originalExecCommand;
    });

    it("uses navigator.clipboard.writeText when available", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText },
        });

        const createElementSpy = vi.spyOn(document, "createElement");

        await copyToClipboard("receipt text");

        expect(writeText).toHaveBeenCalledWith("receipt text");
        expect(createElementSpy.mock.calls.some(([tag]) => tag === "textarea")).toBe(false);
    });

    it("falls back to execCommand when clipboard API unavailable", async () => {
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: undefined,
        });

        const execCommand = vi.spyOn(document, "execCommand").mockReturnValue(true);
        const appendChild = vi.spyOn(document.body, "appendChild");
        const removeChild = vi.spyOn(document.body, "removeChild");

        await copyToClipboard("fallback text");

        expect(execCommand).toHaveBeenCalledWith("copy");
        expect(appendChild).toHaveBeenCalled();
        expect(removeChild).toHaveBeenCalled();
    });

    it("removes textarea from document.body when execCommand returns false", async () => {
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: undefined,
        });

        vi.spyOn(document, "execCommand").mockReturnValue(false);
        const removeChild = vi.spyOn(document.body, "removeChild");

        await expect(copyToClipboard("fail copy")).rejects.toThrow(/Clipboard copy failed/);
        expect(removeChild).toHaveBeenCalled();
    });

    it("removes textarea from document.body when execCommand throws", async () => {
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: undefined,
        });

        vi.spyOn(document, "execCommand").mockImplementation(() => {
            throw new Error("execCommand blocked");
        });
        const removeChild = vi.spyOn(document.body, "removeChild");

        await expect(copyToClipboard("throw copy")).rejects.toThrow(/execCommand blocked/);
        expect(removeChild).toHaveBeenCalled();
    });

    // MUTATION-VERIFY: copyToClipboard.ts — remove document.body.removeChild from finally block.
    // Test: "removes textarea from document.body when execCommand throws". Verified manually: 2026-05-30. REVERTED.
});
