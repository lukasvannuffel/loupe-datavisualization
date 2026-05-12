// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChartSlug } from "@/components/charts/chartPreviews";
import type { Mapping } from "@/app/providers";
import { Upload } from "@/components/pages/Upload";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { useFileParser, type UseFileParser } from "@/lib/parser/useFileParser";
import { brandRows } from "@/lib/parser/types";

vi.mock("next/navigation", () => ({
    useRouter: (): { push: ReturnType<typeof vi.fn> } => ({
        push: vi.fn(),
    }),
}));

const appStateMock = vi.hoisted(() => ({
    hydrated: true,
    intent: "",
    setIntent: vi.fn(),
    mapping: {} as Mapping,
    setMapping: vi.fn(),
    dataset: null as readonly ColumnInference[] | null,
    setDataset: vi.fn(),
    clearDataset: vi.fn(),
    chartSlug: null as ChartSlug | null,
    setChartSlug: vi.fn(),
}));

vi.mock("@/app/providers", () => ({
    AppStateProvider: ({ children }: { children: React.ReactNode }) => children,
    useAppState: () => appStateMock,
}));

vi.mock("@/lib/parser/useFileParser");

const idleParser = (): UseFileParser => ({
    canReturnToSheetPicker: false,
    parse: vi.fn(),
    parseSheet: vi.fn(),
    reset: vi.fn(),
    returnToSheetSelection: vi.fn(),
    state: { status: "idle" },
});

describe("Upload sheet UI", () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        appStateMock.mapping = {};
        vi.mocked(useFileParser).mockImplementation(idleParser);
    });

    it("shows segmented control with three sheets, first selected", async () => {
        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "Sheet1", rowCount: 1247 },
                    { name: "Sheet2", rowCount: 80 },
                    { name: "Data", rowCount: 3 },
                ],
                fileName: "w.xlsx",
                sizeBytes: 1200,
            },
        });

        render(<Upload />);

        const group = await screen.findByRole("radiogroup");

        expect(group).not.toBeNull();

        const radios = within(group).getAllByRole("radio");

        expect(radios.length).toBe(3);
        expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
        expect(radios[1]?.getAttribute("aria-checked")).toBe("false");
        expect(within(group).getByRole("radio", { name: /Sheet1 · 1,247 rows/ })).not.toBeNull();
    });

    it("calls parseSheet with the selected sheet when Continue is pressed", async () => {
        const parseSheet = vi.fn();

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet,
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "A", rowCount: 1 },
                    { name: "B", rowCount: 2 },
                ],
                fileName: "w.xlsx",
                sizeBytes: 900,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /B · 2 rows/ }));
        fireEvent.click(screen.getByRole("button", { name: "Continue with selected worksheet" }));

        expect(parseSheet).toHaveBeenCalledWith("B");
    });

    it("does not render sheet picker when parse succeeded in one step", () => {
        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "success",
                result: {
                    headers: ["a"],
                    rows: brandRows([{ a: "1" }]),
                    rowCount: 1,
                    fileName: "one.xlsx",
                    sizeBytes: 400,
                    sourceFormat: "xlsx",
                    sheetName: "Only",
                },
            },
        });

        render(<Upload />);

        expect(screen.queryByRole("radiogroup")).toBeNull();
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(screen.getByText("one.xlsx")).not.toBeNull();
    });

    it("uses dropdown when more than four sheets", async () => {
        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "S1", rowCount: 2 },
                    { name: "S2", rowCount: 2 },
                    { name: "S3", rowCount: 2 },
                    { name: "S4", rowCount: 2 },
                    { name: "S5", rowCount: 2 },
                ],
                fileName: "big.xlsx",
                sizeBytes: 5000,
            },
        });

        render(<Upload />);

        expect(screen.queryByRole("radiogroup")).toBeNull();

        const combo = await screen.findByRole("combobox");

        expect(combo).not.toBeNull();
        expect(screen.getByRole("option", { name: /S5 · 2 rows/ })).not.toBeNull();
    });

    it("shows mapping reset dialog when switching sheet after mapping exists", async () => {
        appStateMock.mapping = { group: "cohort_id" };

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "First", rowCount: 10 },
                    { name: "Second", rowCount: 11 },
                ],
                fileName: "w.xlsx",
                sizeBytes: 800,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /Second · 11 rows/ }));

        expect(screen.getByRole("dialog")).not.toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("dialog")).toBeNull();

        const radios = screen.getAllByRole("radio");

        expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    });

    it("confirms mapping reset and clears mapping", async () => {
        appStateMock.mapping = { group: "cohort_id" };

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "First", rowCount: 10 },
                    { name: "Second", rowCount: 11 },
                ],
                fileName: "w.xlsx",
                sizeBytes: 800,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /Second · 11 rows/ }));

        const dialog = screen.getByRole("dialog");

        fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));

        expect(appStateMock.setMapping).toHaveBeenCalledWith({});

        const second = screen.getByRole("radio", { name: /Second · 11 rows/ });

        expect(second.getAttribute("aria-checked")).toBe("true");
    });

    it("changes sheet silently when mapping is empty", async () => {
        appStateMock.mapping = {};

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "First", rowCount: 10 },
                    { name: "Second", rowCount: 11 },
                ],
                fileName: "w.xlsx",
                sizeBytes: 800,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /Second · 11 rows/ }));

        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("shows empty workbook error message", () => {
        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "error",
                error: {
                    code: "EMPTY_WORKBOOK",
                    message:
                        "Every worksheet in this file is empty. Add a sheet with a header row or pick another file.",
                },
            },
        });

        render(<Upload />);

        expect(screen.getByRole("alert").textContent).toContain("Every worksheet in this file is empty");
    });

    it("matches mobile snapshot for sheet picker layout", async () => {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "Alpha", rowCount: 100 },
                    { name: "Beta", rowCount: 200 },
                ],
                fileName: "w.xlsx",
                sizeBytes: 900,
            },
        });

        const { container } = render(<Upload />);

        await screen.findByRole("radiogroup");

        const shell = container.querySelector(".sheet-picker-shell");

        expect(shell).not.toBeNull();

        expect(shell).toMatchSnapshot();

        Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    });
});
