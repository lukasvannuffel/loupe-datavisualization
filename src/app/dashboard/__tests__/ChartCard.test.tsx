// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChartCard } from "@/app/dashboard/ChartCard";
import type { ChartListItem } from "@/lib/charts/listCharts";

vi.mock("@/app/dashboard/DeleteChartButton", () => ({
    DeleteChartButton: () => <button type="button">Delete</button>,
}));

const baseChart: ChartListItem = {
    id: "1",
    name: "My KM",
    chart_kind: "km",
    thumbnail: null,
    updated_at: "2026-05-26T10:00:00Z",
    created_at: "2026-05-26T10:00:00Z",
};

describe("ChartCard", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders a card with name, badge, and date", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-28T10:00:00Z"));
        render(<ChartCard chart={baseChart} />);

        expect(screen.getByText("My KM")).not.toBeNull();
        expect(screen.getByText(/Kaplan-Meier/)).not.toBeNull();
        expect(screen.getByText(/2 days ago/)).not.toBeNull();
        vi.useRealTimers();
    });

    it("renders PNG thumbnail as img when thumbnail is a data URL", () => {
        const { container } = render(
            <ChartCard chart={{ ...baseChart, thumbnail: "data:image/png;base64,iVBORw0KGgo" }} />,
        );

        const image = container.querySelector("img");
        expect(image).not.toBeNull();
        expect(image?.getAttribute("src")).toContain("data:image/png");
    });

    it("renders a fallback icon when thumbnail is null", () => {
        const { container } = render(<ChartCard chart={{ ...baseChart, thumbnail: null }} />);

        const image = container.querySelector("img");
        expect(image).not.toBeNull();
        expect(image?.getAttribute("src")).toContain("data:image/svg+xml");
    });

    it("links to export with the chart id", () => {
        render(<ChartCard chart={{ ...baseChart, id: "abc-123" }} />);

        expect(screen.getByRole("link").getAttribute("href")).toBe("/export?id=abc-123");
    });
});
