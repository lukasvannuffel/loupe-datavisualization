// @vitest-environment happy-dom

import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppStateProvider, useAppState, type SelectionMode } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";
import type { Receipt } from "@/lib/chartSpec/types";

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

describe("AppStateProvider selectionMode", () => {
    it("hydrates a valid persisted selectionMode", () => {
        window.sessionStorage.setItem("loupe.selectionMode", "manual");
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.selectionMode).toBe("manual");
    });

    it("ignores a tampered selectionMode (drops silently, defaults to null)", () => {
        window.sessionStorage.setItem("loupe.selectionMode", "not-a-mode");
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.selectionMode).toBeNull();
    });

    it("persists setSelectionMode writes to sessionStorage", () => {
        const { result } = renderHook(() => useAppState(), { wrapper });
        act(() => result.current.setSelectionMode("ai"));
        expect(window.sessionStorage.getItem("loupe.selectionMode")).toBe("ai");
        act(() => result.current.setSelectionMode("manual"));
        expect(window.sessionStorage.getItem("loupe.selectionMode")).toBe("manual");
    });

    it("clears the sessionStorage entry on setSelectionMode(null)", () => {
        window.sessionStorage.setItem("loupe.selectionMode", "ai");
        const { result } = renderHook(() => useAppState(), { wrapper });
        act(() => result.current.setSelectionMode(null));
        expect(window.sessionStorage.getItem("loupe.selectionMode")).toBeNull();
    });

    it("setSelectionMode resets chartSlug to null but preserves intent + mapping", () => {
        const { result } = renderHook(() => useAppState(), { wrapper });
        act(() => result.current.setIntent("Compare survival"));
        act(() => result.current.setMapping({ time: "t", event: "e" }));
        act(() => result.current.setChartSlug("km"));
        expect(result.current.chartSlug).toBe("km");

        act(() => result.current.setSelectionMode("manual" satisfies SelectionMode));

        expect(result.current.chartSlug).toBeNull();
        expect(result.current.intent).toBe("Compare survival");
        expect(result.current.mapping).toEqual({ time: "t", event: "e" });
    });
});

describe("AppStateProvider receipt + chartKind", () => {
    const SAMPLE_RECEIPT: Receipt = {
        alternatives: [],
        intent: "Compare arms",
        overrides: [],
        recommendation: {
            because: "Because.",
            becauseTitle: "Because",
            chartName: "Kaplan–Meier curve",
            handles: "Handles.",
            handlesTitle: "Handles",
            headline: "Headline.",
        },
        selectionMode: "ai",
        tests: [],
        testsTitle: "Tests",
        transformations: [],
    };

    it("hydrates receipt + chartKind from sessionStorage", () => {
        window.sessionStorage.setItem("loupe.receipt", JSON.stringify(SAMPLE_RECEIPT));
        window.sessionStorage.setItem("loupe.chartKind", JSON.stringify("km"));
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.receipt).toEqual(SAMPLE_RECEIPT);
        expect(result.current.chartKind).toBe("km");
    });

    it("drops a malformed receipt entry", () => {
        window.sessionStorage.setItem("loupe.receipt", "{}");
        const { result } = renderHook(() => useAppState(), { wrapper });
        expect(result.current.receipt).toBeNull();
        expect(window.sessionStorage.getItem("loupe.receipt")).toBeNull();
    });
});

describe("AppStateProvider appendOverride", () => {
    const SAMPLE_RECEIPT: Receipt = {
        alternatives: [],
        intent: "Compare arms",
        overrides: [],
        recommendation: {
            because: "Because.",
            becauseTitle: "Because",
            chartName: "Kaplan–Meier curve",
            handles: "Handles.",
            handlesTitle: "Handles",
            headline: "Headline.",
        },
        selectionMode: "ai",
        tests: [],
        testsTitle: "Tests",
        transformations: [],
    };

    const EVENT_1 = {
        at: "2026-05-19T14:23:00.000Z",
        from: "km" as const,
        to: "box" as const,
    };

    const EVENT_2 = {
        at: "2026-05-19T14:25:00.000Z",
        from: "box" as const,
        to: "xy" as const,
    };

    it("appends one override and updates chartKind", () => {
        const { result } = renderHook(() => useAppState(), { wrapper });
        act(() => {
            result.current.setReceipt(SAMPLE_RECEIPT);
            result.current.setChartKind("km");
        });
        act(() => result.current.appendOverride(EVENT_1));
        expect(result.current.receipt?.overrides).toHaveLength(1);
        expect(result.current.receipt?.overrides[0]).toEqual(EVENT_1);
        expect(result.current.chartKind).toBe("box");
        const stored = window.sessionStorage.getItem("loupe.receipt");
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!).overrides).toHaveLength(1);
        expect(window.sessionStorage.getItem("loupe.chartKind")).toBe(JSON.stringify("box"));
    });

    it("appends overrides in chronological order", () => {
        const { result } = renderHook(() => useAppState(), { wrapper });
        act(() => {
            result.current.setReceipt(SAMPLE_RECEIPT);
            result.current.setChartKind("km");
        });
        act(() => result.current.appendOverride(EVENT_1));
        act(() => result.current.appendOverride(EVENT_2));
        expect(result.current.receipt?.overrides).toEqual([EVENT_1, EVENT_2]);
        const firstAt = result.current.receipt?.overrides[0]?.at ?? "";
        const secondAt = result.current.receipt?.overrides[1]?.at ?? "";
        expect(firstAt <= secondAt).toBe(true);
        expect(result.current.chartKind).toBe("xy");
    });

    it("no-ops when receipt is null", () => {
        const { result } = renderHook(() => useAppState(), { wrapper });
        act(() => result.current.appendOverride(EVENT_1));
        expect(result.current.receipt).toBeNull();
        expect(result.current.chartKind).toBeNull();
        expect(window.sessionStorage.getItem("loupe.receipt")).toBeNull();
        expect(window.sessionStorage.getItem("loupe.chartKind")).toBeNull();
    });

    it("survives re-hydration from sessionStorage", () => {
        window.sessionStorage.setItem("loupe.receipt", JSON.stringify(SAMPLE_RECEIPT));
        window.sessionStorage.setItem("loupe.chartKind", JSON.stringify("km"));
        const { result, unmount } = renderHook(() => useAppState(), { wrapper });
        act(() => result.current.appendOverride(EVENT_1));
        unmount();
        const { result: reloaded } = renderHook(() => useAppState(), { wrapper });
        expect(reloaded.current.receipt?.overrides).toEqual([EVENT_1]);
        expect(reloaded.current.chartKind).toBe("box");
    });
});
