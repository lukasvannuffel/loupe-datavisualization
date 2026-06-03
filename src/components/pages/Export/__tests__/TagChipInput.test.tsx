// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TagChipInput } from "@/components/pages/Export/TagChipInput";

const onChange = vi.fn();

afterEach(() => {
    cleanup();
    onChange.mockClear();
});

describe("TagChipInput", () => {
    it("adds a tag on Enter", () => {
        render(<TagChipInput tags={[]} onChange={onChange} />);
        const input = screen.getByLabelText(/tags/i);
        fireEvent.change(input, { target: { value: "cohort a" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith(["cohort a"]);
    });

    it("normalises to lowercase and trims on add", () => {
        render(<TagChipInput tags={[]} onChange={onChange} />);
        const input = screen.getByLabelText(/tags/i);
        fireEvent.change(input, { target: { value: "  Cohort A  " } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith(["cohort a"]);
    });

    it("removes a chip on click", () => {
        render(<TagChipInput tags={["cohort a", "pilot"]} onChange={onChange} />);
        fireEvent.click(screen.getByRole("button", { name: "cohort a" }));

        expect(onChange).toHaveBeenCalledWith(["pilot"]);
    });

    it("removes last chip on Backspace with empty input", () => {
        render(<TagChipInput tags={["cohort a", "pilot"]} onChange={onChange} />);
        const input = screen.getByLabelText(/tags/i);
        fireEvent.keyDown(input, { key: "Backspace" });

        expect(onChange).toHaveBeenCalledWith(["cohort a"]);
    });

    it("does not add duplicate tag", () => {
        render(<TagChipInput tags={["cohort a"]} onChange={onChange} />);
        const input = screen.getByLabelText(/tags/i);
        fireEvent.change(input, { target: { value: "cohort a" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).not.toHaveBeenCalled();
    });

    // MUTATION-VERIFY: In TagChipInput.tsx normaliseTag(), remove `.toLowerCase()`.
    // Test "normalises to lowercase and trims on add" goes RED.
    // Verified manually: 2026-06-03. REVERTED.
});
