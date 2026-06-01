// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Analyzing from "../Analyzing";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

const stubCanvas2d = (): void => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
        function (this: HTMLCanvasElement, type: string) {
            if (type !== "2d") {
                return null;
            }

            return {
                arc: vi.fn(),
                beginPath: vi.fn(),
                clearRect: vi.fn(),
                clip: vi.fn(),
                createRadialGradient: vi.fn(() => ({
                    addColorStop: vi.fn(),
                })),
                drawImage: vi.fn(),
                fill: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                lineTo: vi.fn(),
                moveTo: vi.fn(),
                restore: vi.fn(),
                save: vi.fn(),
                scale: vi.fn(),
                setLineDash: vi.fn(),
                setTransform: vi.fn(),
                stroke: vi.fn(),
                translate: vi.fn(),
            } as unknown as CanvasRenderingContext2D;
        },
    );
};

describe("Analyzing", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("mounts without throwing (JSDOM canvas mock)", () => {
        stubCanvas2d();

        vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
            matches: query === reducedMotionQuery,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        expect(() => render(<Analyzing />)).not.toThrow();
        expect(document.querySelector("canvas.analyzing-canvas")).not.toBeNull();
    });

    // MUTATION-VERIFY: remove `if (prefersReduced) { drawStaticPose(); return ... }` in
    // Analyzing.draw.ts initAnalyzingScene so rAF always starts.
    // Expected red: "does not start rAF loop under prefers-reduced-motion".
    // Verified manually: 2026-06-01. REVERTED.
    it("does not start rAF loop under prefers-reduced-motion", () => {
        stubCanvas2d();
        const raf = vi.spyOn(globalThis, "requestAnimationFrame");

        vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
            matches: query === reducedMotionQuery,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        render(<Analyzing />);

        expect(raf).not.toHaveBeenCalled();
    });

    // MUTATION-VERIFY: insert `return () => undefined;` before `raf = requestAnimationFrame(frame)`
    // in Analyzing.draw.ts initAnalyzingScene (after resizeObserver.observe).
    // Expected red: "starts rAF loop when motion is allowed".
    // Verified manually: 2026-06-01. REVERTED.
    it("starts rAF loop when motion is allowed", () => {
        stubCanvas2d();
        const raf = vi.spyOn(globalThis, "requestAnimationFrame");

        vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        render(<Analyzing />);

        expect(raf).toHaveBeenCalled();
    });

    // MUTATION-VERIFY: replace `return () => clearInterval(id)` with `return undefined` in
    // Analyzing.tsx useEffect L20.
    // Expected red: "clears interval on unmount".
    // Verified manually: 2026-06-01. REVERTED.
    it("clears interval on unmount", () => {
        vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
            matches: query === reducedMotionQuery,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
        const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

        const { unmount: unmountAnalyzing } = render(<Analyzing />);

        expect(setIntervalSpy).toHaveBeenCalled();

        const intervalId = setIntervalSpy.mock.results[0]?.value as ReturnType<
            typeof setInterval
        >;

        unmountAnalyzing();

        expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    });
});
