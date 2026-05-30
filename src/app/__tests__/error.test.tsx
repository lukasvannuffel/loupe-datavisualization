// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/error";

describe("error boundary page", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders friendly heading, not raw error message", () => {
        const reset = vi.fn();
        const error = new Error("SERIALIZE_FAILED at exportSvg.ts:42");

        render(<ErrorPage error={error} reset={reset} />);

        expect(screen.getByRole("heading", { name: "Something went wrong" })).not.toBeNull();
        expect(screen.queryByText(/SERIALIZE_FAILED/)).toBeNull();
    });

    it("reset button calls the reset prop", () => {
        const reset = vi.fn();

        render(<ErrorPage error={new Error("boom")} reset={reset} />);

        fireEvent.click(screen.getByRole("button", { name: "Try again" }));

        expect(reset).toHaveBeenCalledTimes(1);
    });
});
