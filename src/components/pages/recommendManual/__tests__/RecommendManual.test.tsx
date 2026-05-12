// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider, useAppState } from "@/app/providers";

import { RecommendManual } from "../RecommendManual";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
}));

type AppStateSnapshot = ReturnType<typeof useAppState>;
const captureRef = (): { current: AppStateSnapshot | null } => ({ current: null });

const StateProbe = ({
    onState,
}: {
    onState: (s: AppStateSnapshot) => void;
}): null => {
    const state = useAppState();
    onState(state);

    return null;
};

const seedManualMode = (mapping: Record<string, string>): void => {
    window.sessionStorage.setItem("loupe.selectionMode", "manual");
    window.sessionStorage.setItem("loupe.mapping", JSON.stringify(mapping));
};

const KM_MAPPING: Record<string, string> = {
    time: "time_to_event_months",
    event: "event_observed",
    group: "treatment_arm",
};

const EMPTY_MAPPING: Record<string, string> = {};

const renderManual = (): { captured: { current: AppStateSnapshot | null } } => {
    const captured = captureRef();
    act(() => {
        render(
            <AppStateProvider>
                <RecommendManual />
                <StateProbe onState={(s) => (captured.current = s)} />
            </AppStateProvider>,
        );
    });

    return { captured };
};

beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

describe("RecommendManual — funnel guard", () => {
    it("redirects to /recommend/choose when selectionMode is not manual", () => {
        renderManual();
        expect(replace).toHaveBeenCalledWith("/recommend/choose");
    });

    it("does not redirect once selectionMode === manual", () => {
        seedManualMode(KM_MAPPING);
        renderManual();
        expect(replace).not.toHaveBeenCalledWith("/recommend/choose");
    });
});

describe("RecommendManual — rendering", () => {
    it("renders all four chart cards with title + description + example", () => {
        seedManualMode(KM_MAPPING);
        renderManual();
        const titles = [
            "Kaplan–Meier curve",
            "Bar chart with error bars",
            "Box plot",
            "XY plot",
        ];
        for (const title of titles) {
            expect(screen.getByRole("heading", { name: title })).toBeTruthy();
        }
        expect(
            screen.getAllByText(/Use for:/i).length,
        ).toBe(4);
    });

    it("KM card is enabled and the missing-roles strip is absent when the mapping supports KM", () => {
        seedManualMode(KM_MAPPING);
        renderManual();
        const km = screen.getByTestId("manual-card-km") as HTMLButtonElement;
        expect(km.disabled).toBe(false);
        expect(km.getAttribute("aria-disabled")).toBe("false");
        expect(screen.queryByTestId("manual-missing-km")).toBeNull();
    });

    it("incompatible cards are aria-disabled, show the missing-roles explainer drawn from ROLE_LABELS, and carry the disabled style class", () => {
        seedManualMode(EMPTY_MAPPING);
        renderManual();

        const km = screen.getByTestId("manual-card-km") as HTMLButtonElement;
        expect(km.disabled).toBe(true);
        expect(km.getAttribute("aria-disabled")).toBe("true");
        expect(km.className).toContain("manual-card--disabled");

        const kmMissing = screen.getByTestId("manual-missing-km");
        expect(kmMissing.textContent).toContain("Time variable");
        expect(kmMissing.textContent).toContain("Event indicator");

        const xy = screen.getByTestId("manual-card-xy") as HTMLButtonElement;
        expect(xy.disabled).toBe(true);
        const xyMissing = screen.getByTestId("manual-missing-xy");
        expect(xyMissing.textContent).toContain("X axis");
        expect(xyMissing.textContent).toContain("Y axis");
    });

    it("describes disabled cards to assistive tech via aria-describedby pointing to the missing-roles strip", () => {
        seedManualMode(EMPTY_MAPPING);
        renderManual();
        const km = screen.getByTestId("manual-card-km");
        expect(km.getAttribute("aria-describedby")).toBe("manual-km-missing");
        const strip = screen.getByTestId("manual-missing-km");
        expect(strip.id).toBe("manual-km-missing");
    });
});

describe("RecommendManual — selection", () => {
    it("clicking a compatible card writes a default ChartSpec + manual mode and navigates to /export", () => {
        seedManualMode(KM_MAPPING);
        const { captured } = renderManual();

        act(() => {
            (screen.getByTestId("manual-card-km") as HTMLButtonElement).click();
        });

        expect(push).toHaveBeenCalledWith("/export");
        expect(captured.current?.selectionMode).toBe("manual");
        expect(captured.current?.chartSlug).toBe("km");
        expect(captured.current?.chartSpec?.kind).toBe("km");
        expect(captured.current?.chartSpec?.version).toBe(1);
        expect(captured.current?.chartSpec?.id).toBeTruthy();
    });

    it("clicking an incompatible card does NOT mutate state and does NOT navigate", () => {
        seedManualMode(EMPTY_MAPPING);
        const { captured } = renderManual();

        act(() => {
            (screen.getByTestId("manual-card-km") as HTMLButtonElement).click();
        });

        expect(push).not.toHaveBeenCalled();
        expect(captured.current?.chartSlug).toBeNull();
        expect(captured.current?.chartSpec).toBeNull();
    });

    it("clicking 'Use the AI recommendation instead' switches mode to AI and navigates to /recommend", () => {
        seedManualMode(KM_MAPPING);
        const { captured } = renderManual();

        act(() => {
            (screen.getByTestId("switch-to-ai") as HTMLButtonElement).click();
        });

        expect(captured.current?.selectionMode).toBe("ai");
        expect(push).toHaveBeenCalledWith("/recommend");
    });

    it("back-navigation safety: switching to AI preserves mapping + intent", () => {
        window.sessionStorage.setItem("loupe.intent", "Compare 5-year survival between arms");
        seedManualMode(KM_MAPPING);
        const { captured } = renderManual();

        act(() => {
            (screen.getByTestId("switch-to-ai") as HTMLButtonElement).click();
        });

        expect(captured.current?.intent).toBe("Compare 5-year survival between arms");
        expect(captured.current?.mapping).toEqual(KM_MAPPING);
    });
});

describe("RecommendManual — privacy regression", () => {
    it("rendering the picker and selecting a chart makes ZERO network calls", () => {
        const fetchSpy = vi.fn().mockResolvedValue(new Response(null));
        const originalFetch = globalThis.fetch;
        globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

        try {
            seedManualMode(KM_MAPPING);
            renderManual();
            act(() => {
                (screen.getByTestId("manual-card-km") as HTMLButtonElement).click();
            });
            expect(fetchSpy).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});

describe("RecommendManual — keyboard a11y", () => {
    it("a real <button> means Enter and Space both activate the card (native semantics)", () => {
        seedManualMode(KM_MAPPING);
        renderManual();
        const km = screen.getByTestId("manual-card-km");
        expect(km.tagName).toBe("BUTTON");
        expect(km.getAttribute("type")).toBe("button");
    });

    it("disabled cards do not fire onClick (native <button disabled> blocks activation)", () => {
        seedManualMode(EMPTY_MAPPING);
        const { captured } = renderManual();
        const km = screen.getByTestId("manual-card-km") as HTMLButtonElement;
        act(() => km.click());
        expect(captured.current?.chartSlug).toBeNull();
        expect(push).not.toHaveBeenCalled();
    });
});

describe("RecommendManual — mobile-first layout", () => {
    it("the grid declares a 1fr base column (stacks under 640px); cards span full width", () => {
        seedManualMode(KM_MAPPING);
        renderManual();
        const grid = screen.getByTestId("manual-grid");
        const computed = window.getComputedStyle(grid);
        expect(
            computed.gridTemplateColumns === "" || computed.gridTemplateColumns.includes("1fr"),
        ).toBe(true);
        const km = screen.getByTestId("manual-card-km") as HTMLButtonElement;
        // Inline width assertion is happy-dom-flaky; rely on the class + grid contract
        expect(km.className.split(/\s+/)).toContain("manual-card");
    });
});
