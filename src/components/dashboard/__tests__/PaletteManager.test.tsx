// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaletteManager } from "../PaletteManager";

const createPalette = vi.fn();
const deletePalette = vi.fn();
const renamePalette = vi.fn();

vi.mock("@/app/palettes/actions", () => ({
    createPalette: (...args: unknown[]) => createPalette(...args),
    deletePalette: (...args: unknown[]) => deletePalette(...args),
    renamePalette: (...args: unknown[]) => renamePalette(...args),
}));

describe("PaletteManager", () => {
    afterEach(() => {
        cleanup();
        createPalette.mockReset();
        deletePalette.mockReset();
        renamePalette.mockReset();
    });

    it("renders empty state when initialPalettes=[]", () => {
        render(<PaletteManager initialPalettes={[]} />);
        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));

        expect(screen.getByText("No saved palettes yet.")).toBeTruthy();
    });

    it("shows palette list when initialPalettes has entries", () => {
        render(
            <PaletteManager
                initialPalettes={[
                    {
                        id: "00000000-0000-0000-0000-000000000001",
                        name: "Brand",
                        colors: ["#003D6B", "#009FDF"],
                    },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));

        expect(screen.getByDisplayValue("Brand")).toBeTruthy();
    });

    it("shows swatch preview as user types valid hex values", () => {
        const { container } = render(<PaletteManager initialPalettes={[]} />);

        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));
        fireEvent.change(screen.getByPlaceholderText("#F37021, #7DBB42, #009FE3, #000000"), {
            target: { value: "#003D6B, #009FDF" },
        });

        const previewSwatches = container.querySelectorAll(".palette-manager__preview span");
        expect(previewSwatches).toHaveLength(2);
        expect(previewSwatches[0]?.getAttribute("style")).toContain("#003D6B");
    });

    it("calls createPalette server action on save button click", async () => {
        createPalette.mockResolvedValue({
            success: true,
            palette: {
                id: "00000000-0000-0000-0000-000000000099",
                name: "Demo",
                colors: ["#003D6B"],
            },
        });

        render(<PaletteManager initialPalettes={[]} />);
        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));
        fireEvent.change(screen.getByPlaceholderText("Arteveldehogeschool"), {
            target: { value: "Demo" },
        });
        fireEvent.change(screen.getByPlaceholderText("#F37021, #7DBB42, #009FE3, #000000"), {
            target: { value: "#003D6B" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save palette" }));

        await waitFor(() => {
            expect(createPalette).toHaveBeenCalledWith({
                name: "Demo",
                colors: ["#003D6B"],
            });
        });
    });

    it("disables save when name is empty", () => {
        render(<PaletteManager initialPalettes={[]} />);
        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));
        fireEvent.change(screen.getByPlaceholderText("#F37021, #7DBB42, #009FE3, #000000"), {
            target: { value: "#003D6B" },
        });

        expect(screen.getByRole("button", { name: "Save palette" })).toBeDisabled();
    });

    it("disables save when no valid hex values typed", () => {
        render(<PaletteManager initialPalettes={[]} />);
        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));
        fireEvent.change(screen.getByPlaceholderText("Arteveldehogeschool"), {
            target: { value: "Demo" },
        });

        expect(screen.getByRole("button", { name: "Save palette" })).toBeDisabled();
    });

    it("calls renamePalette on blur", async () => {
        renamePalette.mockResolvedValue({
            success: true,
            palette: {
                id: "00000000-0000-0000-0000-000000000001",
                name: "Renamed",
                colors: ["#003D6B"],
            },
        });

        render(
            <PaletteManager
                initialPalettes={[
                    {
                        id: "00000000-0000-0000-0000-000000000001",
                        name: "Brand",
                        colors: ["#003D6B"],
                    },
                ]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /colour palettes/i }));
        fireEvent.change(screen.getByDisplayValue("Brand"), {
            target: { value: "Renamed" },
        });
        fireEvent.blur(screen.getByDisplayValue("Renamed"));

        await waitFor(() => {
            expect(renamePalette).toHaveBeenCalledWith({
                id: "00000000-0000-0000-0000-000000000001",
                name: "Renamed",
            });
        });
    });
});
