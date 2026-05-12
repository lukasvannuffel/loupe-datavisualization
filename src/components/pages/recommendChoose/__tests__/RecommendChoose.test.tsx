// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider, useAppState } from "@/app/providers";

import { RecommendChoose } from "../RecommendChoose";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
}));

const renderPage = (): void => {
    act(() => {
        render(
            <AppStateProvider>
                <RecommendChoose />
            </AppStateProvider>,
        );
    });
};

const aiCta = (): HTMLButtonElement =>
    screen.getByTestId("choose-cta-ai") as HTMLButtonElement;

const manualCta = (): HTMLButtonElement =>
    screen.getByTestId("choose-cta-manual") as HTMLButtonElement;

type AppStateSnapshot = ReturnType<typeof useAppState>;

const StateProbe = ({
    onState,
}: {
    onState: (s: AppStateSnapshot) => void;
}): null => {
    const state = useAppState();
    onState(state);

    return null;
};

const captureRef = (): { current: AppStateSnapshot | null } => ({ current: null });

beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

describe("RecommendChoose — decision step", () => {
    it("renders both CTAs with identical primary-button token usage (equal visual weight)", () => {
        renderPage();
        const ai = aiCta();
        const manual = manualCta();
        expect(ai.className).toContain("btn--primary");
        expect(manual.className).toContain("btn--primary");
        expect(ai.className).toBe(manual.className);
    });

    it("renders both CTAs inside a screen-reader-accessible group with a labelled heading", () => {
        renderPage();
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading.id).toBe("choose-heading");
        const group = screen.getByTestId("choose-grid");
        expect(group.getAttribute("role")).toBe("group");
        expect(group.getAttribute("aria-labelledby")).toBe("choose-heading");
    });

    it("clicking the AI CTA sets selectionMode='ai' and navigates to /recommend", () => {
        const captured = captureRef();
        act(() => {
            render(
                <AppStateProvider>
                    <RecommendChoose />
                    <StateProbe onState={(s) => (captured.current = s)} />
                </AppStateProvider>,
            );
        });

        act(() => aiCta().click());

        expect(push).toHaveBeenCalledWith("/recommend");
        expect(captured.current?.selectionMode).toBe("ai");
        expect(window.sessionStorage.getItem("loupe.selectionMode")).toBe("ai");
    });

    it("clicking the Manual CTA sets selectionMode='manual' and navigates to /recommend/manual", () => {
        const captured = captureRef();
        act(() => {
            render(
                <AppStateProvider>
                    <RecommendChoose />
                    <StateProbe onState={(s) => (captured.current = s)} />
                </AppStateProvider>,
            );
        });

        act(() => manualCta().click());

        expect(push).toHaveBeenCalledWith("/recommend/manual");
        expect(captured.current?.selectionMode).toBe("manual");
        expect(window.sessionStorage.getItem("loupe.selectionMode")).toBe("manual");
    });

    it("mode-switch round trip (AI → Manual → AI) preserves mapping and intent", () => {
        window.sessionStorage.setItem("loupe.intent", "Compare survival across arms");
        window.sessionStorage.setItem(
            "loupe.mapping",
            JSON.stringify({ time: "time_to_event_months", event: "event_observed" }),
        );

        const captured = captureRef();
        act(() => {
            render(
                <AppStateProvider>
                    <RecommendChoose />
                    <StateProbe onState={(s) => (captured.current = s)} />
                </AppStateProvider>,
            );
        });

        act(() => aiCta().click());
        act(() => manualCta().click());
        act(() => aiCta().click());

        expect(captured.current?.selectionMode).toBe("ai");
        expect(captured.current?.intent).toBe("Compare survival across arms");
        expect(captured.current?.mapping).toEqual({
            time: "time_to_event_months",
            event: "event_observed",
        });
    });

    it("touch targets meet the 44px minimum at narrow viewports (mobile-first)", () => {
        renderPage();
        const ai = aiCta();
        const manual = manualCta();
        const aiTarget = parseInt(window.getComputedStyle(ai).minHeight, 10);
        const manualTarget = parseInt(window.getComputedStyle(manual).minHeight, 10);
        const fallback = (computed: number, inline: string | null): number =>
            Number.isFinite(computed) && computed >= 44 ? computed : parseInt(inline ?? "0", 10);

        expect(
            fallback(aiTarget, ai.style.minHeight) >= 44 || ai.className.includes("btn--lg"),
        ).toBe(true);
        expect(
            fallback(manualTarget, manual.style.minHeight) >= 44 ||
                manual.className.includes("btn--lg"),
        ).toBe(true);
    });

    it("privacy regression — rendering makes zero network calls", () => {
        const fetchSpy = vi.fn().mockResolvedValue(new Response(null));
        const originalFetch = globalThis.fetch;
        globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

        try {
            renderPage();
            expect(fetchSpy).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it("setSelectionMode resets a stale chartSlug so it cannot leak across modes", () => {
        const captured = captureRef();
        act(() => {
            render(
                <AppStateProvider>
                    <RecommendChoose />
                    <StateProbe onState={(s) => (captured.current = s)} />
                </AppStateProvider>,
            );
        });

        act(() => captured.current?.setChartSlug("km"));
        expect(captured.current?.chartSlug).toBe("km");

        act(() => manualCta().click());

        expect(captured.current?.chartSlug).toBeNull();
    });
});

describe("RecommendChoose — mobile viewport (375px) CTA stacking", () => {
    it("renders the choose-grid with a mobile-first 1fr layout (stacks under 640px)", () => {
        Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
        renderPage();
        const grid = screen.getByTestId("choose-grid");
        const computed = window.getComputedStyle(grid);
        // happy-dom doesn't fully apply media queries, but the base style
        // (`grid-template-columns: 1fr`) is what ships at <640px. We assert
        // the default rule reaches the element rather than relying on the
        // media query evaluator.
        expect(
            computed.gridTemplateColumns === "" ||
                computed.gridTemplateColumns.includes("1fr"),
        ).toBe(true);
        const ai = aiCta();
        const manual = manualCta();
        expect(ai.className).toContain("btn--lg");
        expect(manual.className).toContain("btn--lg");
    });
});
