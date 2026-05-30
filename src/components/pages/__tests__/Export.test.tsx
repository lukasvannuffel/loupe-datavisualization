// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

import { AppStateProvider, useAppState, type LoupeDataset } from "@/app/providers";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import { updateCustomizationTitle } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { ChartSpec } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { saveChart } from "@/app/charts/actions";
import * as buildReceiptModule from "@/lib/receipt/buildReceipt";
import * as composeReceiptModule from "@/lib/receipt/composeReceipt";
import * as summarizeComputationsModule from "@/lib/receipt/summarizeComputations";

import { Export } from "../Export";

const push = vi.fn();
const saveChartMock = vi.mocked(saveChart);

vi.mock("next/navigation", () => ({
    useRouter: (): { push: typeof push } => ({ push }),
}));

vi.mock("@/app/charts/actions", () => ({
    saveChart: vi.fn(async () => ({ success: true, id: "test-id" })),
}));

vi.mock("../ExportChat/ExportChatLauncher", () => ({
    ExportChatLauncher: (): null => null,
}));

vi.mock("../ExportChat/ExportChatPanel", () => ({
    ExportChatPanel: (): null => null,
}));

const mapping: Mapping = {
    group: "arm",
    outcome: "value",
};

const dataset: LoupeDataset = {
    inferences: [],
    rows: brandRows([{ arm: "A", value: "10" }]),
};

const defaultSpec = createDefaultChartSpec(
    "barError",
    {
        id: "export-spec-1",
        createdAt: "2026-05-20T10:00:00.000Z",
    },
    {
        inferences: dataset.inferences,
        mapping,
        rows: dataset.rows,
    },
);

const SeedExportState = ({
    spec,
    children,
}: {
    readonly spec: ChartSpec;
    readonly children: ReactNode;
}): JSX.Element => {
    const { setChartSlug, setChartSpec, setDataset, setMapping } = useAppState();

    useEffect(() => {
        setDataset(dataset.inferences, dataset.rows);
        setMapping(mapping);
        setChartSlug(spec.kind);
        setChartSpec(spec);
    }, [setChartSlug, setChartSpec, setDataset, setMapping, spec]);

    return <>{children}</>;
};

vi.mock("@/components/charts/SpecChartPanel", () => ({
    SpecChartPanel: ({
        spec,
        onSpecChange,
    }: {
        readonly spec: ChartSpec;
        readonly onSpecChange?: (updater: (prev: ChartSpec) => ChartSpec) => void;
    }): JSX.Element => {
        const labels = resolveChartLabels(spec);

        return (
            <svg aria-label="Spec chart mock" data-palette={spec.customizations?.palette ?? "monochrome"}>
                <text
                    data-role="chart-title"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        if (onSpecChange !== undefined) {
                            onSpecChange((prev) => updateCustomizationTitle(prev, "Inline edited"));
                        }
                    }}
                >
                    {labels.title}
                </text>
            </svg>
        );
    },
}));

const renderExport = (spec: ChartSpec = defaultSpec): ReturnType<typeof render> =>
    render(
        <ToastProvider>
            <AppStateProvider>
                <SeedExportState spec={spec}>
                    <Export />
                </SeedExportState>
            </AppStateProvider>
        </ToastProvider>,
    );

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

beforeEach(() => {
    window.sessionStorage.clear();
    push.mockClear();
    saveChartMock.mockClear();
    saveChartMock.mockResolvedValue({ success: true, id: "test-id" });
});

describe("Export customization rail", () => {
    it("renders the customization rail on /export", async () => {
        renderExport();
        expect(
            await screen.findByRole("complementary", { name: /customize chart/i }),
        ).toBeTruthy();
    });

    it("shows view-only notice and hides editing controls when loaded plot_data is null", async () => {
        render(
            <ToastProvider>
                <AppStateProvider>
                    <Export
                    initialChartId="box-1"
                    initialChart={{
                        id: "box-1",
                        name: "Saved scatter",
                        chart_spec: createDefaultChartSpec(
                            "box",
                            { id: "saved-box", createdAt: "2026-05-28T08:00:00.000Z" },
                            { inferences: [], mapping: {}, rows: brandRows([]) },
                        ),
                        column_mapping: {},
                        receipt: {
                            generated_at: "2026-05-28T08:00:00.000Z",
                            config_hash:
                                "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
                            method: "method",
                            sample: "sample",
                            palette: "editorial",
                            software: "Loupe v0.1.0 · client-side",
                            ai_rationale: "why",
                            csv_columns: [],
                            n_rows_input: 1,
                        },
                        plot_data: null,
                        thumbnail: "data:image/svg+xml;utf8,test",
                        chart_kind: "box",
                        created_at: "2026-05-28T08:00:00.000Z",
                        updated_at: "2026-05-28T08:00:00.000Z",
                    }}
                    />
                </AppStateProvider>
            </ToastProvider>,
        );

        expect(
            await screen.findByText(/saved as a snapshot to protect patient data/i),
        ).toBeTruthy();
        expect(screen.queryByRole("button", { name: /save to project/i })).toBeNull();
        expect(screen.queryByRole("complementary", { name: /customize chart/i })).toBeNull();
    });

    it("shows customization rail when loaded chart has plot_data", async () => {
        render(
            <ToastProvider>
                <AppStateProvider>
                    <Export
                    initialChartId="km-1"
                    initialChart={{
                        id: "km-1",
                        name: "Saved km",
                        chart_spec: createDefaultChartSpec(
                            "km",
                            { id: "saved-km", createdAt: "2026-05-28T08:00:00.000Z" },
                            { inferences: [], mapping: {}, rows: brandRows([]) },
                        ),
                        column_mapping: {},
                        receipt: {
                            generated_at: "2026-05-28T08:00:00.000Z",
                            config_hash:
                                "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
                            method: "Kaplan-Meier estimator, Greenwood log-log CI",
                            sample: "n = 100 · censored = 0",
                            palette: "editorial",
                            software: "Loupe v0.1.0 · client-side",
                            ai_rationale: "why",
                            csv_columns: ["time", "event"],
                            n_rows_input: 1,
                        },
                        plot_data: {
                            kind: "km",
                            tMax: 12,
                            groups: [
                                {
                                    label: "Arm A",
                                    nTotal: 10,
                                    nEvents: 1,
                                    points: [{ t: 1, survival: 0.9, nAtRisk: 10, censored: false, ciLower: 0.7, ciUpper: 1 }],
                                    atRiskTicks: [{ t: 0, nAtRisk: 10 }],
                                },
                            ],
                        },
                        thumbnail: "data:image/png;base64,thumb",
                        chart_kind: "km",
                        created_at: "2026-05-28T08:00:00.000Z",
                        updated_at: "2026-05-28T08:00:00.000Z",
                    }}
                    />
                </AppStateProvider>
            </ToastProvider>,
        );

        expect(await screen.findByRole("complementary", { name: /customize chart/i })).toBeTruthy();
    });

    // MUTATION-VERIFY:
    //   In src/components/pages/Export.tsx, mutate the exact rail guard:
    //   `viewOnlySnapshot === null && useSpecFigure && liveSpec !== null`
    //   to
    //   `useSpecFigure && liveSpec !== null`.
    //   Re-run "shows view-only notice and hides editing controls when loaded plot_data is null".
    //   The rail becomes visible, so `queryByRole("complementary", { name: /customize chart/i })` is non-null -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.

    it("rail title input edits the spec live", async () => {
        renderExport();

        const titleInput = await screen.findByLabelText(/figure title/i);
        fireEvent.change(titleInput, { target: { value: "New title" } });

        await waitFor(() => {
            expect(document.querySelector(".export-canvas-title")?.textContent).toBe("New title");
            expect(document.querySelector('[data-role="chart-title"]')?.textContent).toBe(
                "New title",
            );
        });
    });

    it("palette selector is available on export", async () => {
        renderExport();
        expect(screen.getByRole("listbox", { name: /chart palette/i })).toBeTruthy();
        expect(screen.getAllByRole("option")).toHaveLength(7);
    });

    it("selecting okabe-ito palette marks the option active", async () => {
        renderExport();
        const okabeOption = screen.getByRole("option", { name: /Okabe–Ito/i });
        fireEvent.click(okabeOption);
        expect(okabeOption.getAttribute("aria-selected")).toBe("true");
    });

    it("selecting okabe-ito palette updates the live chart spec", async () => {
        renderExport();
        fireEvent.click(screen.getByRole("option", { name: /Okabe–Ito/i }));

        await waitFor(() => {
            expect(document.querySelector('[data-palette]')?.getAttribute("data-palette")).toBe(
                "okabe-ito",
            );
        });
    });

    it("updates reproducibility receipt hash when palette changes", async () => {
        renderExport();

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /copy receipt/i })).toBeTruthy();
        });

        const hashBefore = screen.getByText(/config hash:/i).textContent;
        fireEvent.click(screen.getByRole("option", { name: /Okabe–Ito/i }));

        await waitFor(() => {
            expect(screen.getByText(/config hash:/i).textContent).not.toBe(hashBefore);
        });
    });

    it("inline-edit on the rendered title persists to the spec", async () => {
        renderExport();

        const renderedTitle = document.querySelector('[data-role="chart-title"]');
        expect(renderedTitle).toBeTruthy();
        fireEvent.click(renderedTitle!);

        await waitFor(() => {
            expect(document.querySelector('[data-role="chart-title"]')?.textContent).toBe(
                "Inline edited",
            );
        });
    });

    // MUTATION-VERIFY:
    //   In Export.tsx, comment out <CustomizationRail ... /> (lines 818-825).
    //   Test: "renders the customization rail on /export".
    //   findByRole("complementary", { name: /customize chart/i }) rejects → RED.
    //   Verified manually: 2026-05-25. REVERTED.
});

describe("computation snapshot", () => {
    it("panel hash and saved config_hash share one computation snapshot", async () => {
        const summarizeSpy = vi.spyOn(summarizeComputationsModule, "summarizeComputations");
        const buildSpy = vi.spyOn(buildReceiptModule, "buildReceipt");
        const composeSpy = vi.spyOn(composeReceiptModule, "composeReceipt");

        renderExport();

        await waitFor(() => {
            expect(summarizeSpy).toHaveBeenCalled();
            expect(buildSpy).toHaveBeenCalled();
            expect(composeSpy).toHaveBeenCalled();
        });

        const buildInput = buildSpy.mock.calls.at(-1)?.[0];
        const composeInput = composeSpy.mock.calls.at(-1)?.[0];

        expect(buildInput?.computations).toBe(composeInput?.computations);

        const composedResult = composeSpy.mock.results.at(-1);
        const savedResult = buildSpy.mock.results.at(-1);
        expect(composedResult?.type).toBe("return");
        expect(savedResult?.type).toBe("return");

        const composed = await (composedResult?.value as Promise<Awaited<ReturnType<typeof composeReceiptModule.composeReceipt>>>);
        const saved = await (savedResult?.value as Promise<Awaited<ReturnType<typeof buildReceiptModule.buildReceipt>>>);

        expect(saved.config_hash).toBe(composed.hash);

        summarizeSpy.mockRestore();
        buildSpy.mockRestore();
        composeSpy.mockRestore();
    });

    it("snapshot recomputes when spec changes", async () => {
        const summarizeSpy = vi.spyOn(summarizeComputationsModule, "summarizeComputations");

        renderExport();

        await waitFor(() => {
            expect(summarizeSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
        });

        const firstSnapshot = summarizeSpy.mock.results.at(-1)?.value;

        fireEvent.click(screen.getByRole("option", { name: /Okabe–Ito/i }));

        await waitFor(() => {
            expect(summarizeSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
        });

        const secondSnapshot = summarizeSpy.mock.results.at(-1)?.value;

        expect(secondSnapshot).not.toBe(firstSnapshot);

        summarizeSpy.mockRestore();
    });

    it("save is blocked when computation snapshot is null", async () => {
        const summarizeSpy = vi.spyOn(summarizeComputationsModule, "summarizeComputations");
        const buildSpy = vi.spyOn(buildReceiptModule, "buildReceipt");

        render(
            <ToastProvider>
                <AppStateProvider>
                    <Export
                        initialChartId="box-1"
                        initialChart={{
                            id: "box-1",
                            name: "Saved scatter",
                            chart_spec: createDefaultChartSpec(
                                "box",
                                { id: "saved-box", createdAt: "2026-05-28T08:00:00.000Z" },
                                { inferences: [], mapping: {}, rows: brandRows([]) },
                            ),
                            column_mapping: {},
                            receipt: {
                                generated_at: "2026-05-28T08:00:00.000Z",
                                config_hash:
                                    "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
                                method: "method",
                                sample: "sample",
                                palette: "editorial",
                                software: "Loupe v0.1.0 · client-side",
                                ai_rationale: "why",
                                csv_columns: ["arm"],
                                n_rows_input: 1,
                            },
                            plot_data: null,
                            thumbnail: "data:image/svg+xml;utf8,test",
                            chart_kind: "box",
                            created_at: "2026-05-28T08:00:00.000Z",
                            updated_at: "2026-05-28T08:00:00.000Z",
                        }}
                    />
                </AppStateProvider>
            </ToastProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText(/saved as a snapshot to protect patient data/i)).toBeTruthy();
        });

        expect(summarizeSpy).not.toHaveBeenCalled();
        expect(buildSpy).not.toHaveBeenCalled();
        expect(saveChartMock).not.toHaveBeenCalled();

        summarizeSpy.mockRestore();
        buildSpy.mockRestore();
    });

    // MUTATION-VERIFY: mock summarizeComputations to return two distinct objects on successive calls;
    // test "panel hash and saved config_hash share one computation snapshot" must RED. Verified manually: 2026-05-30. REVERTED.
});
