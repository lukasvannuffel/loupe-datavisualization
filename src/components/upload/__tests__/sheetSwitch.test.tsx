// @vitest-environment happy-dom

import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

import { AppStateProvider, useAppState, type Mapping } from "@/app/providers";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Upload } from "@/components/pages/Upload";
import { Export } from "@/components/pages/Export";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import { useFileParser, type UseFileParser } from "@/lib/parser/useFileParser";

const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { push: typeof push } => ({ push }),
}));

vi.mock("@/lib/parser/useFileParser");

vi.mock("@/app/charts/actions", () => ({
    saveChart: vi.fn(async () => ({ success: true, id: "saved-chart-id" })),
}));

vi.mock("@/components/pages/ExportChat/ExportChatLauncher", () => ({
    ExportChatLauncher: (): null => null,
}));

vi.mock("@/components/pages/ExportChat/ExportChatPanel", () => ({
    ExportChatPanel: (): null => null,
}));

const uploadAppStateMock = vi.hoisted(() => ({
    hydrated: true,
    intent: "",
    setIntent: vi.fn(),
    mapping: {} as Mapping,
    setMapping: vi.fn(),
    dataset: null,
    setDataset: vi.fn(),
    clearDataset: vi.fn(),
    chartSlug: null,
    setChartSlug: vi.fn(),
}));

const uploadProvidersMock = vi.hoisted(() => ({
    useRealProvider: false,
}));

vi.mock("@/app/providers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/app/providers")>();

    return {
        ...actual,
        useAppState: (): ReturnType<typeof actual.useAppState> => {
            if (uploadProvidersMock.useRealProvider) {
                return actual.useAppState();
            }

            return uploadAppStateMock as unknown as ReturnType<typeof actual.useAppState>;
        },
    };
});

const idleParser = (): UseFileParser => ({
    canReturnToSheetPicker: false,
    parse: vi.fn(),
    parseSheet: vi.fn(),
    reset: vi.fn(),
    returnToSheetSelection: vi.fn(),
    state: { status: "idle" },
});

const KM_MAPPING: Mapping = {
    event: "event_observed",
    group: "treatment_arm",
    id: "patient_id",
    time: "time_to_event_months",
};

describe("LOUPE-23 sheetSwitch — mid-flow sheet change", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        uploadProvidersMock.useRealProvider = false;
    });

    beforeEach(() => {
        uploadProvidersMock.useRealProvider = false;
        uploadAppStateMock.mapping = {};
        vi.mocked(useFileParser).mockImplementation(idleParser);
    });

    it("shows confirm dialog when switching sheet with existing mapping, then resets on Continue", async () => {
        uploadAppStateMock.mapping = { group: "treatment_arm", time: "time_to_event_months" };

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "Baseline", rowCount: 120 },
                    { name: "FollowUp", rowCount: 88 },
                ],
                fileName: "oncology-trial.xlsx",
                sizeBytes: 4096,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /FollowUp · 88 rows/ }));

        const dialog = screen.getByRole("dialog");

        expect(within(dialog).getByText(/reset your column mapping/i)).not.toBeNull();

        fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));

        expect(uploadAppStateMock.setMapping).toHaveBeenCalledWith({});
        expect(screen.getByRole("radio", { name: /FollowUp · 88 rows/ }).getAttribute("aria-checked")).toBe(
            "true",
        );
    });

    it("cancels sheet switch and keeps original sheet selected", async () => {
        uploadAppStateMock.mapping = { outcome: "tumor_size_mm" };

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "Baseline", rowCount: 120 },
                    { name: "FollowUp", rowCount: 88 },
                ],
                fileName: "oncology-trial.xlsx",
                sizeBytes: 4096,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /FollowUp · 88 rows/ }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.queryByRole("dialog")).toBeNull();
        expect(screen.getByRole("radio", { name: /Baseline · 120 rows/ }).getAttribute("aria-checked")).toBe(
            "true",
        );
        expect(uploadAppStateMock.setMapping).not.toHaveBeenCalledWith({});
    });

    it("switches sheet silently when mapping is empty", async () => {
        uploadAppStateMock.mapping = {};

        vi.mocked(useFileParser).mockReturnValue({
            canReturnToSheetPicker: false,
            parse: vi.fn(),
            parseSheet: vi.fn(),
            reset: vi.fn(),
            returnToSheetSelection: vi.fn(),
            state: {
                status: "needs_sheet_selection",
                sheets: [
                    { name: "Baseline", rowCount: 120 },
                    { name: "FollowUp", rowCount: 88 },
                ],
                fileName: "oncology-trial.xlsx",
                sizeBytes: 4096,
            },
        });

        render(<Upload />);

        fireEvent.click(await screen.findByRole("radio", { name: /FollowUp · 88 rows/ }));

        expect(screen.queryByRole("dialog")).toBeNull();
    });
});

describe("LOUPE-23 sheetSwitch — manual ↔ AI mapping preservation", () => {
    afterEach(() => {
        cleanup();
        window.sessionStorage.clear();
        uploadProvidersMock.useRealProvider = false;
    });

    beforeEach(() => {
        uploadProvidersMock.useRealProvider = true;
        window.sessionStorage.clear();
    });

    it("preserves intent and mapping when switching from manual to AI mode", () => {
        window.sessionStorage.setItem("loupe.intent", "Compare 5-year survival between pembrolizumab and placebo");
        window.sessionStorage.setItem("loupe.mapping", JSON.stringify(KM_MAPPING));
        window.sessionStorage.setItem("loupe.selectionMode", "manual");
        window.sessionStorage.setItem("loupe.chartSlug", JSON.stringify("box"));

        const { result } = renderHook(() => useAppState(), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <AppStateProvider>{children}</AppStateProvider>
            ),
        });

        act(() => {
            result.current.setSelectionMode("ai");
        });

        expect(result.current.intent).toBe("Compare 5-year survival between pembrolizumab and placebo");
        expect(result.current.mapping).toEqual(KM_MAPPING);
        expect(result.current.chartSlug).toBeNull();
        expect(result.current.chartSpec).toBeNull();
    });

    it("preserves mapping when round-tripping AI → manual → AI", () => {
        window.sessionStorage.setItem("loupe.mapping", JSON.stringify(KM_MAPPING));
        window.sessionStorage.setItem("loupe.intent", "Show hazard over follow-up");

        const { result } = renderHook(() => useAppState(), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <AppStateProvider>{children}</AppStateProvider>
            ),
        });

        act(() => {
            result.current.setSelectionMode("ai");
        });
        act(() => {
            result.current.setSelectionMode("manual");
        });
        act(() => {
            result.current.setSelectionMode("ai");
        });

        expect(result.current.mapping).toEqual(KM_MAPPING);
        expect(result.current.intent).toBe("Show hazard over follow-up");
    });
});

describe("LOUPE-23 sheetSwitch — browser back after save", () => {
    afterEach(() => {
        cleanup();
        window.sessionStorage.clear();
        push.mockClear();
        uploadProvidersMock.useRealProvider = false;
    });

    beforeEach(() => {
        uploadProvidersMock.useRealProvider = true;
        window.sessionStorage.clear();
        push.mockClear();
    });

    it("re-hydrates wizard state when user navigates back to /export after save", async () => {
        const mapping: Mapping = {
            group: "arm",
            outcome: "tumor_volume",
        };
        const rows = brandRows([
            { arm: "control", tumor_volume: "12.4" },
            { arm: "pembro", tumor_volume: "9.1" },
        ]);
        const spec = createDefaultChartSpec(
            "box",
            { id: "export-box-1", createdAt: "2026-05-30T10:00:00.000Z" },
            { inferences: [], mapping, rows },
        );

        window.sessionStorage.setItem("loupe.mapping", JSON.stringify(mapping));
        window.sessionStorage.setItem("loupe.dataset", JSON.stringify([]));
        window.sessionStorage.setItem("loupe.datasetRows", JSON.stringify(rows));
        window.sessionStorage.setItem("loupe.chartSpec", JSON.stringify(spec));
        window.sessionStorage.setItem("loupe.chartSlug", JSON.stringify("box"));
        window.sessionStorage.setItem("loupe.chartKind", JSON.stringify("box"));
        window.sessionStorage.setItem("loupe.selectionMode", "manual");

        const SeedAndExport = (): JSX.Element => {
            const { setChartSpec, setChartSlug, setDataset, setMapping } = useAppState();

            useEffect(() => {
                setDataset([], rows);
                setMapping(mapping);
                setChartSlug("box");
                setChartSpec(spec);
            }, [setChartSpec, setChartSlug, setDataset, setMapping]);

            return <Export />;
        };

        const view = render(
            <ToastProvider>
                <AppStateProvider>
                    <SeedAndExport />
                </AppStateProvider>
            </ToastProvider>,
        );

        await waitFor(() => {
            expect(screen.getByRole("complementary", { name: /customize chart/i })).toBeTruthy();
        });

        view.unmount();

        render(
            <ToastProvider>
                <AppStateProvider>
                    <SeedAndExport />
                </AppStateProvider>
            </ToastProvider>,
        );

        await waitFor(() => {
            expect(screen.getByRole("complementary", { name: /customize chart/i })).toBeTruthy();
        });

        expect(window.sessionStorage.getItem("loupe.mapping")).not.toBeNull();
        expect(window.sessionStorage.getItem("loupe.chartSpec")).not.toBeNull();
    });
});
