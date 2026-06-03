// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "@/components/ui/Dialog";

const onClose = vi.fn();

afterEach(() => {
    cleanup();
    onClose.mockClear();
});

describe("Dialog scrim dismiss", () => {
    it("closes when pointer down and click both start on the scrim", () => {
        render(
            <Dialog open onClose={onClose} title="Test dialog">
                <input aria-label="Inner field" />
            </Dialog>,
        );

        const scrim = document.querySelector(".rerun-scrim");
        expect(scrim).toBeTruthy();

        fireEvent.pointerDown(scrim!, { pointerId: 1, button: 0 });
        fireEvent.click(scrim!);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when text selection ends on the scrim after pointer down inside the panel", () => {
        render(
            <Dialog open onClose={onClose} title="Test dialog">
                <input aria-label="Inner field" />
            </Dialog>,
        );

        const scrim = document.querySelector(".rerun-scrim");
        const input = screen.getByLabelText(/inner field/i);
        expect(scrim).toBeTruthy();

        fireEvent.pointerDown(input, { pointerId: 1, button: 0 });
        fireEvent.pointerUp(scrim!, { pointerId: 1, button: 0 });
        fireEvent.click(scrim!);

        expect(onClose).not.toHaveBeenCalled();
    });
});
