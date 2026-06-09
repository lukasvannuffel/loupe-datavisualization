// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

import { AppStateProvider, useAppState, type LoupeDataset } from "@/app/providers";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { resolvePalette } from "@/components/charts/d3/palettes";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { BarErrorSpec, ChartSpec } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import * as useResizeObserverModule from "@/components/charts/d3/useResizeObserver";

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
    rows: brandRows([
        { arm: "A", value: "10" },
        { arm: "B", value: "14" },
    ]),
};

const barSpec = createDefaultChartSpec(
    "barError",
    {
        id: "export-palette-chart",
        createdAt: "2026-05-20T10:00:00.000Z",
    },
    {
        inferences: dataset.inferences,
        mapping,
        rows: dataset.rows,
    },
) as BarErrorSpec;

vi.mock("@/lib/chartSpec/aggregators/barError", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/chartSpec/aggregators/barError")>();

    return {
        ...actual,
        aggregateBarError: () => ({
            groups: [
                { label: "A", mean: 10, sd: 1, n: 20 },
                { label: "B", mean: 14, sd: 1.5, n: 25 },
            ],
            missing: {
                dropRate: 0,
                droppedRows: 0,
                missingGroupRows: 0,
                missingOutcomeRows: 0,
                totalRows: 2,
            },
        }),
    };
});

const stableDims = { width: 400, height: 250 };

const SeedExportState = ({ children }: { readonly children: ReactNode }): JSX.Element => {
    const { setChartSlug, setChartSpec, setDataset, setMapping } = useAppState();

    useEffect(() => {
        setDataset(dataset.inferences, dataset.rows);
        setMapping(mapping);
        setChartSlug("barError");
        setChartSpec(barSpec);
    }, [setChartSlug, setChartSpec, setDataset, setMapping]);

    return <>{children}</>;
};

const ChartSpecProbe = ({
    onChartSpec,
}: {
    readonly onChartSpec: (spec: ChartSpec | null) => void;
}): null => {
    const { chartSpec } = useAppState();

    useEffect(() => {
        onChartSpec(chartSpec);
    }, [chartSpec, onChartSpec]);

    return null;
};

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
});

beforeEach(() => {
    window.sessionStorage.clear();
    vi.spyOn(useResizeObserverModule, "useResizeObserver").mockReturnValue([
        { current: null },
        stableDims,
    ]);
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
        cb(0);

        return 1;
    });
});

describe("Export palette chart integration", () => {
    it("okabe-ito palette tints bar fills in the live chart", async () => {
        render(
            <ToastProvider>
                <AppStateProvider>
                    <SeedExportState>
                        <Export />
                    </SeedExportState>
                </AppStateProvider>
            </ToastProvider>,
        );

        await screen.findByRole("complementary", { name: /customize chart/i });

        await waitFor(() => {
            expect(document.querySelector("rect.bar")).toBeTruthy();
        });

        fireEvent.click(screen.getByRole("option", { name: /Okabe–Ito/i }));

        await waitFor(() => {
            const fills = [...document.querySelectorAll("rect.bar")].map((bar) =>
                bar.getAttribute("fill"),
            );
            expect(fills.some((fill) => fill?.match(/var\(--palette-okabe-ito-0\)|#0072B2/i))).toBe(
                true,
            );
        });
    });

    it("palette customization does not update AppStateProvider during Export render", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const latestSpec = { current: null as ChartSpec | null };
        const onChartSpec = (spec: ChartSpec | null): void => {
            latestSpec.current = spec;
        };

        render(
            <ToastProvider>
                <AppStateProvider>
                    <SeedExportState>
                        <ChartSpecProbe onChartSpec={onChartSpec} />
                        <Export />
                    </SeedExportState>
                </AppStateProvider>
            </ToastProvider>,
        );

        await screen.findByRole("complementary", { name: /customize chart/i });

        fireEvent.click(screen.getByRole("option", { name: /Okabe–Ito/i }));

        await waitFor(() => {
            expect(latestSpec.current).not.toBeNull();
            expect(resolvePalette(latestSpec.current!)).toBe("okabe-ito");
        });

        const setStateDuringRender = consoleError.mock.calls.some((call) =>
            String(call[0]).includes("Cannot update a component"),
        );
        expect(setStateDuringRender).toBe(false);

        consoleError.mockRestore();
    });
});
