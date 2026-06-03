// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SaveChartDialog } from "@/components/pages/Export/SaveChartDialog";

const onConfirm = vi.fn();
const onCancel = vi.fn();

const renderDialog = (defaultName = "KM Survival Analysis"): ReturnType<typeof render> =>
    render(
        <SaveChartDialog
            isOpen
            defaultName={defaultName}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />,
    );

afterEach(() => {
    cleanup();
    onConfirm.mockClear();
    onCancel.mockClear();
});

describe("SaveChartDialog", () => {
    it("blocks submit and shows inline error when name is empty after trim", () => {
        renderDialog();
        const input = screen.getByLabelText(/chart name/i);
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent(/cannot be empty/i);
    });

    it("calls onConfirm with defaultName when submitted unchanged", () => {
        renderDialog("KM Survival Analysis");
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        expect(onConfirm).toHaveBeenCalledWith("KM Survival Analysis", []);
    });

    it("calls onConfirm with trimmed new name when changed", () => {
        renderDialog("KM Survival Analysis");
        const input = screen.getByLabelText(/chart name/i);
        fireEvent.change(input, { target: { value: "  Sensitivity run 1  " } });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        expect(onConfirm).toHaveBeenCalledWith("Sensitivity run 1", []);
    });

    it("passes tags to onConfirm", () => {
        renderDialog("Chart");
        const tagInput = screen.getByLabelText(/^tags$/i);
        fireEvent.change(tagInput, { target: { value: "pilot" } });
        fireEvent.keyDown(tagInput, { key: "Enter" });
        fireEvent.change(tagInput, { target: { value: "cohort a" } });
        fireEvent.keyDown(tagInput, { key: "Enter" });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        expect(onConfirm).toHaveBeenCalledWith("Chart", ["pilot", "cohort a"]);
    });

    it("resets tags to defaultTags on reopen", () => {
        const { rerender } = render(
            <SaveChartDialog
                isOpen
                defaultName="Chart"
                defaultTags={["pilot"]}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: "pilot" }));
        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

        rerender(
            <SaveChartDialog
                isOpen={false}
                defaultName="Chart"
                defaultTags={["pilot"]}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );
        rerender(
            <SaveChartDialog
                isOpen
                defaultName="Chart"
                defaultTags={["pilot"]}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );

        expect(screen.getByRole("button", { name: "pilot" })).toBeTruthy();
    });

    it("does not reset input to defaultName when dialog stays open and defaultName changes", () => {
        const { rerender } = render(
            <SaveChartDialog
                isOpen
                defaultName="Original"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );
        const input = screen.getByLabelText(/chart name/i);
        fireEvent.change(input, { target: { value: "My custom name" } });

        rerender(
            <SaveChartDialog
                isOpen
                defaultName="Changed title"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />,
        );

        expect((screen.getByLabelText(/chart name/i) as HTMLInputElement).value).toBe(
            "My custom name",
        );
    });

    it("blocks submit when name contains invalid characters", () => {
        renderDialog();
        const input = screen.getByLabelText(/chart name/i);
        fireEvent.change(input, { target: { value: "Analysis/Variant" } });
        fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.getByRole("alert")).toHaveTextContent(/cannot contain/i);
    });

    // MUTATION-VERIFY: In SaveChartDialog.tsx useEffect, add defaultName back to deps: [defaultName, isOpen].
    // Test "does not reset input to defaultName when dialog stays open and defaultName changes" goes RED.
    // Verified manually: 2026-06-03. REVERTED.

    // MUTATION-VERIFY: In SaveChartDialog.tsx validateName(), remove `if (trimmed.length === 0)`.
    // Test "blocks submit and shows inline error when name is empty after trim" goes RED.
    // Verified manually: 2026-06-03. REVERTED.

    // MUTATION-VERIFY: In SaveChartDialog.tsx onSubmit, change onConfirm(trimmed) to onConfirm("").
    // Test "calls onConfirm with defaultName when submitted unchanged" goes RED.
    // Verified manually: 2026-06-03. REVERTED.
});
