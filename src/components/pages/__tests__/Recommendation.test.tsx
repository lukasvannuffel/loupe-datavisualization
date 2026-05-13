// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Receipt } from "@/lib/chartSpec/types";

import { Recommendation } from "../Recommendation";

vi.mock("next/navigation", () => ({
    useRouter: (): { push: ReturnType<typeof vi.fn> } => ({
        push: vi.fn(),
    }),
}));

const setChartSlug = vi.fn();
const setSelectionMode = vi.fn();

vi.mock("@/app/providers", () => ({
    useAppState: (): {
        chartSlug: null;
        intent: string;
        setChartSlug: typeof setChartSlug;
        setSelectionMode: typeof setSelectionMode;
    } => ({
        chartSlug: null,
        intent: "",
        setChartSlug,
        setSelectionMode,
    }),
}));

const sampleReceipt = (): Receipt => ({
    alternatives: [],
    intent: "Compare arms",
    recommendation: {
        because: "Because body.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Handles body.",
        handlesTitle: "Handles",
        headline: "Headline.",
    },
    selectionMode: "ai",
    tests: [{ label: "Log-rank" }],
    testsTitle: "Tests",
    transformations: [{ chart: "KM curve.", verb: "becomes a" }],
});

describe("Recommendation", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setChartSlug.mockClear();
        setSelectionMode.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it("renders receipt sections", () => {
        render(<Recommendation chartKind="km" fromCache={false} receipt={sampleReceipt()} />);
        expect(document.body.textContent).toContain("Compare arms");
        expect(screen.getByText("Headline.")).toBeTruthy();
        expect(screen.getByText(/Log-rank/)).toBeTruthy();
    });

    it("shows cached badge only when fromCache is true", () => {
        const { rerender } = render(
            <Recommendation chartKind="km" fromCache={false} receipt={sampleReceipt()} />,
        );
        expect(screen.queryByText(/cached · instant/i)).toBeNull();
        rerender(<Recommendation chartKind="km" fromCache={true} receipt={sampleReceipt()} />);
        expect(screen.getByText(/cached · instant/i)).toBeTruthy();
    });

    it("runs phase timers: dissolve, chart reveal, then why panel", async () => {
        render(<Recommendation chartKind="km" fromCache={false} receipt={sampleReceipt()} />);
        const intentRoot = document.querySelector(".rec-intent");
        expect(intentRoot).not.toBeNull();
        const firstWord = intentRoot?.querySelector(".rec-word");
        expect(firstWord?.className.includes("dissolving")).toBe(false);

        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        expect(firstWord?.className.includes("dissolving")).toBe(true);

        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        expect(document.querySelector(".rec-chart-reveal")).toBeTruthy();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });
        expect(document.querySelector(".rec-why-stage.is-visible")).toBeTruthy();
    });

    it("does not update phase after unmount mid-sequence", async () => {
        const err = vi.spyOn(console, "error").mockImplementation(() => {});
        const { unmount } = render(<Recommendation chartKind="km" fromCache={false} receipt={sampleReceipt()} />);
        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        unmount();
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(err).not.toHaveBeenCalled();
        err.mockRestore();
    });
});
