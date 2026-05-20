// @vitest-environment happy-dom

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useResizeObserver } from "../useResizeObserver";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

const Harness = ({
    onSize,
}: {
    readonly onSize: (size: { width: number; height: number } | null) => void;
}): JSX.Element => {
    const [ref, size] = useResizeObserver<HTMLDivElement>();
    onSize(size);

    return <div ref={ref} data-testid="target" style={{ width: 200, height: 100 }} />;
};

describe("useResizeObserver", () => {
    let disconnect: ReturnType<typeof vi.fn>;
    let trigger: ObserverCallback;

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("updates size when the observer fires", async () => {
        disconnect = vi.fn();
        class MockResizeObserver {
            constructor(cb: ObserverCallback) {
                trigger = cb;
            }
            observe = vi.fn();
            disconnect = disconnect;
        }
        vi.stubGlobal("ResizeObserver", MockResizeObserver);
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });

        const sizes: Array<{ width: number; height: number } | null> = [];
        render(<Harness onSize={(s) => sizes.push(s)} />);

        await act(async () => {
            trigger([
                {
                    contentRect: { width: 320, height: 200, x: 0, y: 0, top: 0, left: 0, bottom: 200, right: 320, toJSON: () => ({}) },
                } as ResizeObserverEntry,
            ]);
        });

        expect(sizes.at(-1)).toEqual({ width: 320, height: 200 });
    });

    it("disconnects on unmount", () => {
        disconnect = vi.fn();
        class MockResizeObserver {
            constructor(cb: ObserverCallback) {
                trigger = cb;
            }
            observe = vi.fn();
            disconnect = disconnect;
        }
        vi.stubGlobal("ResizeObserver", MockResizeObserver);

        const { unmount } = render(<Harness onSize={() => undefined} />);
        unmount();
        expect(disconnect).toHaveBeenCalled();
    });

    it("coalesces rapid resizes via requestAnimationFrame", async () => {
        disconnect = vi.fn();
        class MockResizeObserver {
            constructor(cb: ObserverCallback) {
                trigger = cb;
            }
            observe = vi.fn();
            disconnect = disconnect;
        }
        vi.stubGlobal("ResizeObserver", MockResizeObserver);

        const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });

        const sizes: Array<{ width: number; height: number } | null> = [];
        render(<Harness onSize={(s) => sizes.push(s)} />);

        await act(async () => {
            trigger([
                {
                    contentRect: { width: 100, height: 50, x: 0, y: 0, top: 0, left: 0, bottom: 50, right: 100, toJSON: () => ({}) },
                } as ResizeObserverEntry,
            ]);
            trigger([
                {
                    contentRect: { width: 400, height: 250, x: 0, y: 0, top: 0, left: 0, bottom: 250, right: 400, toJSON: () => ({}) },
                } as ResizeObserverEntry,
            ]);
        });

        expect(sizes.at(-1)).toEqual({ width: 400, height: 250 });
        expect(rafSpy).toHaveBeenCalled();
        rafSpy.mockRestore();
    });
});
