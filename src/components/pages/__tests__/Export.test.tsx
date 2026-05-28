// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

import { AppStateProvider, useAppState, type LoupeDataset } from "@/app/providers";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import { updateCustomizationTitle } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { ChartSpec } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { Export } from "../Export";

const push = vi.fn();

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
        <AppStateProvider>
            <SeedExportState spec={spec}>
                <Export />
            </SeedExportState>
        </AppStateProvider>,
    );

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

beforeEach(() => {
    window.sessionStorage.clear();
    push.mockClear();
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
                            config_hash: "hash",
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
            </AppStateProvider>,
        );

        expect(
            await screen.findByText(/saved as a snapshot to protect patient data/i),
        ).toBeTruthy();
        expect(screen.queryByRole("button", { name: /save to project/i })).toBeNull();
        expect(screen.queryByRole("complementary", { name: /customize chart/i })).toBeNull();
    });

    it("shows customization rail when loaded chart has plot_data", async () => {
        render(
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
                            config_hash: "sha256·abcdef12…beef",
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
            </AppStateProvider>,
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

    it("shows live palette name in the receipt when using spec figure", async () => {
        renderExport();
        fireEvent.click(screen.getByRole("option", { name: /Okabe–Ito/i }));

        await waitFor(() => {
            const paletteEntry = screen.getByText("okabe-ito");
            expect(paletteEntry.closest("dd")).toBeTruthy();
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
