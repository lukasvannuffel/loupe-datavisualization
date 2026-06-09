// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { ChartListItem } from "@/lib/charts/listCharts";

const deleteChartMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/charts/actions", () => ({
    deleteChart: deleteChartMock,
    updateChartMetadata: vi.fn(async () => ({
        success: true,
        updated_at: "2026-05-28T10:00:00Z",
    })),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const charts: readonly ChartListItem[] = [
    {
        id: "1",
        name: "Pilot KM",
        chart_kind: "km",
        thumbnail: null,
        tags: ["pilot"],
        updated_at: "2026-05-26T10:00:00Z",
        created_at: "2026-05-26T10:00:00Z",
    },
    {
        id: "2",
        name: "Cohort bar",
        chart_kind: "bar",
        thumbnail: null,
        tags: ["cohort a"],
        updated_at: "2026-05-25T10:00:00Z",
        created_at: "2026-05-25T10:00:00Z",
    },
    {
        id: "3",
        name: "Untagged",
        chart_kind: "xy",
        thumbnail: null,
        tags: [],
        updated_at: "2026-05-24T10:00:00Z",
        created_at: "2026-05-24T10:00:00Z",
    },
];

const renderShell = (items: readonly ChartListItem[] = charts) =>
    render(
        <ToastProvider>
            <DashboardShell initialCharts={items} displayName="Researcher" />
        </ToastProvider>,
    );

afterEach(() => {
    cleanup();
    deleteChartMock.mockReset();
});

describe("Dashboard tag filter", () => {
    it("shows all charts when no tag is active", () => {
        renderShell();

        expect(screen.getByText("Pilot KM")).toBeTruthy();
        expect(screen.getByText("Cohort bar")).toBeTruthy();
        expect(screen.getByText("Untagged")).toBeTruthy();
    });

    it("filters charts when a tag pill is clicked", () => {
        renderShell();

        fireEvent.click(screen.getByRole("button", { name: /pilot/i }));

        expect(screen.getByText("Pilot KM")).toBeTruthy();
        expect(screen.queryByText("Cohort bar")).toBeNull();
        expect(screen.queryByText("Untagged")).toBeNull();
    });

    it("clears filter when active tag is clicked again", () => {
        renderShell();

        fireEvent.click(screen.getByRole("button", { name: /pilot/i }));
        fireEvent.click(screen.getByRole("button", { name: /pilot/i }));

        expect(screen.getByText("Pilot KM")).toBeTruthy();
        expect(screen.getByText("Cohort bar")).toBeTruthy();
        expect(screen.getByText("Untagged")).toBeTruthy();
    });

    it("filters charts when search query matches title", () => {
        renderShell();

        fireEvent.change(screen.getByLabelText("Search charts"), {
            target: { value: "cohort" },
        });

        expect(screen.queryByText("Pilot KM")).toBeNull();
        expect(screen.getByText("Cohort bar")).toBeTruthy();
        expect(screen.queryByText("Untagged")).toBeNull();
    });

    it("does not render tag filter when no charts have tags", () => {
        const untaggedCharts: readonly ChartListItem[] = charts.map((chart) => ({
            ...chart,
            tags: [],
        }));
        renderShell(untaggedCharts);

        expect(screen.queryByRole("group", { name: /filter by tag/i })).toBeNull();
    });

    it("switches to list view when list toggle is clicked", () => {
        renderShell();

        fireEvent.click(screen.getByRole("button", { name: "List view" }));

        expect(document.querySelector('[class*="dashList"]')).toBeTruthy();
    });

    it("removes a chart from the dashboard immediately after delete confirms", async () => {
        deleteChartMock.mockResolvedValue({ success: true });
        renderShell();

        const moreButtons = screen.getAllByLabelText(/more actions/i);
        fireEvent.click(moreButtons[0]);
        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(screen.queryByText("Pilot KM")).toBeNull();
        });
        expect(screen.getByText("Cohort bar")).toBeTruthy();
        expect(screen.getByText("Untagged")).toBeTruthy();
    });

    // MUTATION-VERIFY: In DashboardShell.tsx, set filtered = charts always.
    // Test "filters charts when a tag pill is clicked" goes RED.
    // Verified manually: 2026-06-08. REVERTED.
});
