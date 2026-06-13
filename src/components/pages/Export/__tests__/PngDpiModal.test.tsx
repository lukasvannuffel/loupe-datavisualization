// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PngDpiModal } from "@/components/pages/Export/PngDpiModal";

const onSelect = vi.fn();
const onClose = vi.fn();
const props = { loading: false as const, onSelect, onClose };

afterEach(() => {
    cleanup();
    onSelect.mockClear();
    onClose.mockClear();
});

describe("PngDpiModal", () => {
    it("renders nothing when open=false", () => {
        const { container } = render(<PngDpiModal open={false} {...props} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders the compact dialog panel when open", () => {
        render(<PngDpiModal open {...props} />);
        expect(document.querySelector(".dialog-compact-scrim")).toBeTruthy();
        expect(document.querySelector(".dialog-compact-panel")).toBeTruthy();
        expect(screen.getByRole("dialog", { name: /export as png/i })).toBeTruthy();
    });

    it("calls onClose when Escape is pressed", () => {
        render(<PngDpiModal open {...props} />);
        fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onSelect(300) when the 300 dpi button is clicked", () => {
        render(<PngDpiModal open {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /standard \(300 dpi\)/i }));
        expect(onSelect).toHaveBeenCalledWith(300);
    });

    it("calls onSelect(600) when the 600 dpi button is clicked", () => {
        render(<PngDpiModal open {...props} />);
        fireEvent.click(screen.getByRole("button", { name: /high resolution \(600 dpi\)/i }));
        expect(onSelect).toHaveBeenCalledWith(600);
    });

    it("shows RingLoader inside the active dpi button when loading=300", () => {
        const { container } = render(<PngDpiModal open loading={300} onSelect={onSelect} onClose={onClose} />);
        expect(screen.getByRole("button", { name: /exporting/i }).querySelector(".ring-loader")).toBeTruthy();
        expect(container.querySelectorAll(".png-dpi-option .ring-loader")).toHaveLength(1);
    });

    it("prevents Escape close while loading", () => {
        render(<PngDpiModal open loading={300} onSelect={onSelect} onClose={onClose} />);
        fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog", { name: /export as png/i })).toBeTruthy();
    });

    // MUTATION-VERIFY: In PngDpiModal.tsx handleClose, remove `if (loading !== false) return;`.
    // Test "prevents Escape close while loading" goes RED.
    // Verified manually: 2026-06-13. REVERTED.
});
