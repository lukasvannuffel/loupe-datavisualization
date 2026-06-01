// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ExportError from "@/app/export/error";

const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { push: typeof push } => ({ push }),
}));

describe("export error boundary", () => {
    afterEach(() => {
        cleanup();
        push.mockClear();
    });

    it("primary Try again calls reset", () => {
        const reset = vi.fn();
        render(<ExportError error={new Error("render failed")} reset={reset} />);

        fireEvent.click(screen.getByRole("button", { name: "Try again" }));

        expect(reset).toHaveBeenCalledTimes(1);
    });

    it("secondary navigates to /recommend", () => {
        render(<ExportError error={new Error("render failed")} reset={vi.fn()} />);

        fireEvent.click(screen.getByRole("button", { name: /back to recommendation/i }));

        expect(push).toHaveBeenCalledWith("/recommend");
    });
});
