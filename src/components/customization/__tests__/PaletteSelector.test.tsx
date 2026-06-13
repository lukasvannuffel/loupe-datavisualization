// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaletteSelector } from "../PaletteSelector";

describe("PaletteSelector", () => {
    afterEach(() => {
        cleanup();
    });

    it('renders "MY PALETTES" section label when userPalettes is non-empty', () => {
        render(
            <PaletteSelector
                value="monochrome"
                userPalettes={[
                    {
                        id: "00000000-0000-0000-0000-000000000001",
                        name: "Brand",
                        colors: ["#003D6B", "#009FDF"],
                    },
                ]}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByText("MY PALETTES")).toBeTruthy();
        expect(screen.getByText("Brand")).toBeTruthy();
    });

    it("does not render section label when userPalettes is empty or undefined", () => {
        const { rerender } = render(
            <PaletteSelector value="monochrome" userPalettes={[]} onChange={vi.fn()} />,
        );

        expect(screen.queryByText("MY PALETTES")).toBeNull();

        rerender(<PaletteSelector value="monochrome" onChange={vi.fn()} />);

        expect(screen.queryByText("MY PALETTES")).toBeNull();
    });

    it("custom palette option is selectable and triggers onChange with UUID", () => {
        const onChange = vi.fn();

        render(
            <PaletteSelector
                value="monochrome"
                userPalettes={[
                    {
                        id: "00000000-0000-0000-0000-000000000001",
                        name: "Brand",
                        colors: ["#003D6B"],
                    },
                ]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole("option", { name: /brand/i }));

        expect(onChange).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
    });

    // MUTATION-VERIFY:
    //   PaletteSelector.tsx:97 — comment out `userPalettes !== undefined && userPalettes.length > 0`.
    //   Test: 'renders "MY PALETTES" section label when userPalettes is non-empty'.
    //   Verified manually: 2026-06-13. REVERTED.
});
