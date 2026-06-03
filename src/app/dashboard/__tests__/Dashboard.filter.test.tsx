// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardChartGrid } from "@/app/dashboard/DashboardChartGrid";
import type { ChartListItem } from "@/lib/charts/listCharts";

vi.mock("@/app/dashboard/DeleteChartButton", () => ({
    DeleteChartButton: () => <button type="button">Delete</button>,
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

afterEach(() => {
    cleanup();
});

describe("Dashboard tag filter", () => {
    it("shows all charts when no tag is active", () => {
        render(<DashboardChartGrid charts={charts} />);

        expect(screen.getByText("Pilot KM")).toBeTruthy();
        expect(screen.getByText("Cohort bar")).toBeTruthy();
        expect(screen.getByText("Untagged")).toBeTruthy();
    });

    it("filters charts when a tag button is clicked", () => {
        render(<DashboardChartGrid charts={charts} />);

        fireEvent.click(screen.getByRole("button", { name: "pilot" }));

        expect(screen.getByText("Pilot KM")).toBeTruthy();
        expect(screen.queryByText("Cohort bar")).toBeNull();
        expect(screen.queryByText("Untagged")).toBeNull();
    });

    it("clears filter when active tag is clicked again", () => {
        render(<DashboardChartGrid charts={charts} />);

        fireEvent.click(screen.getByRole("button", { name: "pilot" }));
        fireEvent.click(screen.getByRole("button", { name: "pilot" }));

        expect(screen.getByText("Pilot KM")).toBeTruthy();
        expect(screen.getByText("Cohort bar")).toBeTruthy();
        expect(screen.getByText("Untagged")).toBeTruthy();
    });

    it("does not render filter UI when no charts have tags", () => {
        const untaggedCharts: readonly ChartListItem[] = charts.map((chart) => ({
            ...chart,
            tags: [],
        }));
        render(<DashboardChartGrid charts={untaggedCharts} />);

        expect(screen.queryByRole("group", { name: /filter by tag/i })).toBeNull();
    });

    // MUTATION-VERIFY: In DashboardChartGrid.tsx, set filteredCharts = charts always.
    // Test "filters charts when a tag button is clicked" goes RED.
    // Verified manually: 2026-06-03. REVERTED.
});
