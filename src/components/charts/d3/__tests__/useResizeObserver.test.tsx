// @vitest-environment happy-dom

import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useResizeObserver } from "../useResizeObserver";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;
type Dimensions = { readonly width: number; readonly height: number };

const Harness = ({
    onSize,
}: {
    readonly onSize: (size: Dimensions | null) => void;
}): JSX.Element => {
    const [ref, size] = useResizeObserver<HTMLDivElement>();
    onSize(size);

    return <div ref={ref} data-testid="target" style={{ width: 200, height: 100 }} />;
};

const CoalesceHarness = ({
    onResize,
}: {
    readonly onResize: (size: Dimensions) => void;
}): JSX.Element => {
    const [ref, size] = useResizeObserver<HTMLDivElement>();

    useEffect(() => {
        if (size !== null) {
            onResize(size);
        }
    }, [size, onResize]);

    return <div ref={ref} data-testid="target" style={{ width: 200, height: 100 }} />;
};

const entry = (width: number, height: number): ResizeObserverEntry =>
    ({
        contentRect: {
            width,
            height,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            bottom: height,
            right: width,
            toJSON: () => ({}),
        },
    }) as ResizeObserverEntry;

describe("useResizeObserver", () => {
    let disconnect: ReturnType<typeof vi.fn>;
    let trigger: ObserverCallback;

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
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
            trigger([entry(320, 200)]);
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

        const rafQueue: FrameRequestCallback[] = [];
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            rafQueue.push(cb);

            return rafQueue.length;
        });
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {
            rafQueue.pop();
        });

        const resizeEvents: Dimensions[] = [];
        const onResize = vi.fn((size: Dimensions) => {
            resizeEvents.push(size);
        });

        render(<CoalesceHarness onResize={onResize} />);

        await act(async () => {
            onResize.mockClear();
            resizeEvents.length = 0;
            rafQueue.length = 0;
            for (let i = 0; i < 5; i += 1) {
                trigger([entry(100 + i * 10, 50 + i)]);
            }
        });

        expect(onResize).not.toHaveBeenCalled();
        expect(rafQueue).toHaveLength(1);

        await act(async () => {
            rafQueue[0]?.(0);
        });

        expect(onResize).toHaveBeenCalledTimes(1);
        expect(onResize).toHaveBeenCalledWith({ width: 140, height: 54 });
    });
});
