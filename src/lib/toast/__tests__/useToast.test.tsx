// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { useToast, useToastMessages } from "@/lib/toast/useToast";

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <ToastProvider>{children}</ToastProvider>
);

describe("useToast", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("toast() adds a message with a unique id", () => {
        const { result } = renderHook(
            () => ({
                controls: useToast(),
                messages: useToastMessages(),
            }),
            { wrapper },
        );

        act(() => {
            result.current.controls.toast({
                title: "Saved",
                variant: "success",
            });
            result.current.controls.toast({
                title: "Copied",
                variant: "info",
            });
        });

        expect(result.current.messages).toHaveLength(2);
        expect(result.current.messages[0]?.id).not.toBe(result.current.messages[1]?.id);
    });

    it("dismiss() removes the correct message by id", () => {
        const { result } = renderHook(
            () => ({
                controls: useToast(),
                messages: useToastMessages(),
            }),
            { wrapper },
        );

        act(() => {
            result.current.controls.toast({ title: "One", variant: "info" });
            result.current.controls.toast({ title: "Two", variant: "info" });
        });

        const firstId = result.current.messages[0]?.id;

        act(() => {
            if (firstId !== undefined) {
                result.current.controls.dismiss(firstId);
            }
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]?.title).toBe("Two");
    });

    it("toast auto-dismisses after durationMs", () => {
        const { result } = renderHook(
            () => ({
                controls: useToast(),
                messages: useToastMessages(),
            }),
            { wrapper },
        );

        act(() => {
            result.current.controls.toast({
                durationMs: 1000,
                title: "Temporary",
                variant: "info",
            });
        });

        expect(result.current.messages).toHaveLength(1);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.messages).toHaveLength(0);
    });

    it("durationMs: 0 does not auto-dismiss", () => {
        const { result } = renderHook(
            () => ({
                controls: useToast(),
                messages: useToastMessages(),
            }),
            { wrapper },
        );

        act(() => {
            result.current.controls.toast({
                durationMs: 0,
                title: "Persistent",
                variant: "error",
            });
        });

        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        expect(result.current.messages).toHaveLength(1);
    });

    it("dismissAll() clears all messages", () => {
        const { result } = renderHook(
            () => ({
                controls: useToast(),
                messages: useToastMessages(),
            }),
            { wrapper },
        );

        act(() => {
            result.current.controls.toast({ title: "One", variant: "info" });
            result.current.controls.toast({ title: "Two", variant: "warning" });
        });

        act(() => {
            result.current.controls.dismissAll();
        });

        expect(result.current.messages).toHaveLength(0);
    });

    // MUTATION-VERIFY:
    //   In src/lib/toast/useToast.ts toast(), replace `crypto.randomUUID()` with the literal `"fixed-id"`.
    //   Re-run "toast() adds a message with a unique id".
    //   Second toast shares the first id -> expect(messages[0]?.id).not.toBe(messages[1]?.id) RED.
    //   Verified manually: 2026-05-30. REVERTED.
});
