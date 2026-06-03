// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChartCard } from "@/app/dashboard/ChartCard";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { ChartListItem } from "@/lib/charts/listCharts";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/charts/actions", () => ({
    deleteChart: vi.fn(),
}));

const renderCard = (chart: ChartListItem) =>
    render(
        <ToastProvider>
            <ChartCard chart={chart} />
        </ToastProvider>,
    );

const baseChart: ChartListItem = {
    id: "1",
    name: "My KM",
    chart_kind: "km",
    thumbnail: null,
    tags: [],
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
        renderCard(baseChart);

        expect(screen.getByText("My KM")).not.toBeNull();
        expect(screen.getByText(/Kaplan-Meier/)).not.toBeNull();
        expect(screen.getByText(/2 days ago/)).not.toBeNull();
        vi.useRealTimers();
    });

    it("renders PNG thumbnail as img when thumbnail is a data URL", () => {
        const { container } = renderCard({
            ...baseChart,
            thumbnail: "data:image/png;base64,iVBORw0KGgo",
        });

        const image = container.querySelector("img");
        expect(image).not.toBeNull();
        expect(image?.getAttribute("src")).toContain("data:image/png");
        expect(image?.getAttribute("width")).toBe("480");
        expect(image?.getAttribute("height")).toBe("320");
    });

    it("renders a fallback icon when thumbnail is null", () => {
        const { container } = renderCard({ ...baseChart, thumbnail: null });

        const image = container.querySelector("img");
        expect(image).not.toBeNull();
        expect(image?.getAttribute("src")).toContain("data:image/svg+xml");
    });

    it("links to export with the chart id", () => {
        renderCard({ ...baseChart, id: "abc-123" });

        expect(screen.getByRole("link").getAttribute("href")).toBe("/export?id=abc-123");
    });

    it("shows kebab button on focus", () => {
        renderCard(baseChart);

        const kebab = screen.getByRole("button", { name: /more actions/i });
        expect(kebab).not.toBeNull();
    });

    it("does not render a visible Delete button by default", () => {
        renderCard(baseChart);

        expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
    });
});
