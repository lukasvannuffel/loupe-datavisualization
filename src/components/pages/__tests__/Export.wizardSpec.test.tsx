// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

import { AppStateProvider, useAppState, type LoupeDataset } from "@/app/providers";
import type { Receipt } from "@/lib/chartSpec/types";
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
    time: "months",
    event: "status",
    group: "arm",
};

const dataset: LoupeDataset = {
    inferences: [],
    rows: brandRows([{ months: "1", status: "1", arm: "A" }]),
};

const receipt: Receipt = {
    alternatives: [],
    intent: "Compare survival",
    overrides: [],
    recommendation: {
        because: "Because body.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Handles body.",
        handlesTitle: "Handles",
        headline: "Headline.",
    },
    selectionMode: "ai",
    tests: [{ label: "Log-rank" }],
    testsTitle: "Tests",
    transformations: [{ chart: "KM curve.", verb: "becomes a" }],
};

const SeedWizardExportState = ({ children }: { readonly children: ReactNode }): JSX.Element => {
    const { setChartKind, setDataset, setMapping, setReceipt } = useAppState();

    useEffect(() => {
        setReceipt(receipt);
        setChartKind("km");
        setDataset(dataset.inferences, dataset.rows);
        setMapping(mapping);
    }, [setChartKind, setDataset, setMapping, setReceipt]);

    return <>{children}</>;
};

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

beforeEach(() => {
    window.sessionStorage.clear();
});

describe("Export wizard spec bootstrap", () => {
    it("shows live customization rail when chartSpec was not pre-seeded", async () => {
        render(
            <AppStateProvider>
                <SeedWizardExportState>
                    <Export />
                </SeedWizardExportState>
            </AppStateProvider>,
        );

        await waitFor(() => {
            expect(screen.getByRole("complementary", { name: /customize chart/i })).toBeTruthy();
        });

        expect(screen.queryByText(/dashed second series/i)).toBeNull();
        expect(screen.queryByRole("button", { name: /reset to defaults/i })).toBeNull();
    });
});
