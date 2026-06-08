// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TopNav } from "../TopNav";

const push = vi.fn();
const refresh = vi.fn();
const unsubscribe = vi.fn();

vi.mock("next/navigation", () => ({
    usePathname: (): string => "/",
    useRouter: (): { push: typeof push; refresh: typeof refresh } => ({
        push,
        refresh,
    }),
}));

vi.mock("@/app/auth/actions", () => ({
    signOut: vi.fn(),
}));

vi.mock("@/utils/supabase/client", () => ({
    createClient: (): {
        auth: {
            onAuthStateChange: (
                callback: (event: string) => void,
            ) => { data: { subscription: { unsubscribe: typeof unsubscribe } } };
        };
    } => ({
        auth: {
            onAuthStateChange: (callback: (event: string) => void) => {
                callback("INITIAL_SESSION");
                return { data: { subscription: { unsubscribe } } };
            },
        },
    }),
}));

vi.mock("@/components/chrome/AccountMenu", () => ({
    AccountMenu: (): JSX.Element => <div data-testid="account-menu" />,
}));

vi.mock("@/components/primitives/Wordmark", () => ({
    Wordmark: (): JSX.Element => <span>Loupe</span>,
}));

describe("TopNav scroll transparency", () => {
    const pendingFrames: FrameRequestCallback[] = [];

    const flushFrames = (): void => {
        const callbacks = pendingFrames.splice(0);
        for (const callback of callbacks) {
            callback(0);
        }
    };

    beforeEach(() => {
        pendingFrames.length = 0;
        Object.defineProperty(window, "scrollY", {
            configurable: true,
            writable: true,
            value: 0,
        });
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number => {
            pendingFrames.push(callback);
            return pendingFrames.length;
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it("applies is-scrolled class when scrollY > 80", () => {
        const { container } = render(<TopNav user={null} />);
        const nav = container.querySelector(".nav");

        act(() => {
            flushFrames();
        });

        expect(nav?.classList.contains("is-scrolled")).toBe(false);

        act(() => {
            Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
            fireEvent.scroll(window);
            flushFrames();
        });

        expect(nav?.classList.contains("is-scrolled")).toBe(true);
    });

    it("removes is-scrolled class when scrolled back to top", () => {
        Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
        const { container } = render(<TopNav user={null} />);
        const nav = container.querySelector(".nav");

        act(() => {
            flushFrames();
        });

        expect(nav?.classList.contains("is-scrolled")).toBe(true);

        act(() => {
            Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
            fireEvent.scroll(window);
            flushFrames();
        });

        expect(nav?.classList.contains("is-scrolled")).toBe(false);
    });

    it("cleans up scroll listener on unmount", () => {
        const addSpy = vi.spyOn(window, "addEventListener");
        const removeSpy = vi.spyOn(window, "removeEventListener");

        const { unmount } = render(<TopNav user={null} />);
        const scrollCall = addSpy.mock.calls.find(
            (call) => String(call[0]) === "scroll",
        );

        expect(scrollCall).toBeDefined();

        unmount();

        expect(removeSpy).toHaveBeenCalledWith("scroll", scrollCall?.[1]);

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
