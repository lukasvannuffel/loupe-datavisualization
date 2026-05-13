// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiWarning } from "../PhiWarning";

describe("PhiWarning", () => {
    afterEach(() => {
        cleanup();
        document.body.classList.remove("is-locked");
    });

    it("renders nothing when matches empty", () => {
        const { container } = render(
            <PhiWarning
                matches={[]}
                onCancel={vi.fn()}
                onRenameColumns={vi.fn()}
                onSendAnyway={vi.fn()}
            />,
        );
        expect(container.textContent).toBe("");
    });

    it("lists matches", () => {
        render(
            <PhiWarning
                matches={[
                    { column: "email", reason: "email address" },
                    { column: "Phone", reason: "phone number" },
                ]}
                onCancel={vi.fn()}
                onRenameColumns={vi.fn()}
                onSendAnyway={vi.fn()}
            />,
        );
        expect(screen.getByText("Phone")).not.toBeNull();
        expect(screen.getAllByText(/email/).length).toBeGreaterThanOrEqual(1);
    });

    it("two-click send anyway before calling onSendAnyway", () => {
        const send = vi.fn();
        render(
            <PhiWarning
                matches={[{ column: "email", reason: "email address" }]}
                onCancel={vi.fn()}
                onRenameColumns={vi.fn()}
                onSendAnyway={send}
            />,
        );
        const btn = screen.getByRole("button", { name: /Send anyway/i });
        fireEvent.click(btn);
        expect(send).not.toHaveBeenCalled();
        fireEvent.click(btn);
        expect(send).toHaveBeenCalledTimes(1);
    });

    it("rename modal saves changed names as a single batched call", () => {
        const rename = vi.fn();
        render(
            <PhiWarning
                matches={[{ column: "email", reason: "email address" }]}
                onCancel={vi.fn()}
                onRenameColumns={rename}
                onSendAnyway={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: /^Rename$/i }));
        const input = screen.getByDisplayValue("email");
        fireEvent.change(input, { target: { value: "contact_bucket" } });
        fireEvent.click(screen.getByRole("button", { name: /Save names/i }));
        expect(rename.mock.calls[0]?.[0]).toEqual([{ oldName: "email", newName: "contact_bucket" }]);
    });

    it("Escape closes modal", () => {
        render(
            <PhiWarning
                matches={[{ column: "email", reason: "email address" }]}
                onCancel={vi.fn()}
                onRenameColumns={vi.fn()}
                onSendAnyway={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: /^Rename$/i }));
        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.queryByRole("dialog")).toBeNull();
    });
});
