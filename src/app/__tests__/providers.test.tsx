// @vitest-environment happy-dom

import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppStateProvider, useAppState } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";

const VALID: ColumnInference = {
    name: "age",
    primaryType: "numeric",
    confidence: 0.9,
    reasons: [],
    nullCount: 0,
    uniqueCount: 5,
    sampleValues: ["1", "2"],
};

const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <AppStateProvider>{children}</AppStateProvider>
);

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

beforeEach(() => {
    window.sessionStorage.clear();
});

describe("AppStateProvider hydration", () => {
    it("accepts a well-formed persisted dataset", () => {
        window.sessionStorage.setItem("loupe.dataset", JSON.stringify([VALID]));
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.hydrated).toBe(true);
        expect(result.current.dataset).toEqual([VALID]);
    });

    it("drops a malformed persisted dataset and removes the key", () => {
        window.sessionStorage.setItem(
            "loupe.dataset",
            JSON.stringify({ inferences: [{ name: "x" }] }),
        );
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.hydrated).toBe(true);
        expect(result.current.dataset).toBeNull();
        expect(window.sessionStorage.getItem("loupe.dataset")).toBeNull();
    });

    it("drops a dataset where sampleValues exceeds the privacy cap", () => {
        const tampered = {
            ...VALID,
            sampleValues: ["1", "2", "3", "4", "5", "6"],
        };
        window.sessionStorage.setItem("loupe.dataset", JSON.stringify([tampered]));
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.dataset).toBeNull();
        expect(window.sessionStorage.getItem("loupe.dataset")).toBeNull();
    });

    it("drops invalid JSON", () => {
        window.sessionStorage.setItem("loupe.dataset", "not-json");
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.dataset).toBeNull();
        expect(window.sessionStorage.getItem("loupe.dataset")).toBeNull();
    });

    it("renders children once hydrated", () => {
        const { container } = render(
            <AppStateProvider>
                <div data-testid="child">ok</div>
            </AppStateProvider>,
        );
        act(() => {});
        expect(container.textContent).toContain("ok");
    });
});
