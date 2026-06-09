// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChartCard } from "@/app/dashboard/ChartCard";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { ChartListItem } from "@/lib/charts/listCharts";
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from "@/lib/thumbnail/generateThumbnail";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/charts/actions", () => ({
    deleteChart: vi.fn(),
    updateChartMetadata: vi.fn(async () => ({
        success: true,
        updated_at: "2026-05-28T10:00:00Z",
    })),
}));

const onUpdateChart = vi.fn(async () => true);
const onDeleteChart = vi.fn();

const renderCard = (chart: ChartListItem) =>
    render(
        <ToastProvider>
            <ChartCard
                chart={chart}
                onUpdateChart={onUpdateChart}
                onDeleteChart={onDeleteChart}
            />
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
        onUpdateChart.mockClear();
    });

    it("renders a card with name, type chip, and date", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-28T10:00:00Z"));
        renderCard(baseChart);

        expect(screen.getByText("My KM")).not.toBeNull();
        expect(screen.getByText(/Kaplan–Meier/)).not.toBeNull();
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
        expect(image?.getAttribute("width")).toBe(String(THUMBNAIL_WIDTH));
        expect(image?.getAttribute("height")).toBe(String(THUMBNAIL_HEIGHT));
    });

    it("renders a fallback icon when thumbnail is null", () => {
        const { container } = renderCard({ ...baseChart, thumbnail: null });

        const image = container.querySelector("img");
        expect(image).not.toBeNull();
        expect(image?.getAttribute("src")).toContain("data:image/svg+xml");
    });

    it("links to export with the chart id", () => {
        renderCard({ ...baseChart, id: "abc-123" });

        expect(screen.getByRole("link", { name: /open/i }).getAttribute("href")).toBe(
            "/export?id=abc-123",
        );
    });

    it("exposes more actions control on the thumbnail", () => {
        renderCard(baseChart);

        const more = screen.getByLabelText(/more actions/i);
        expect(more.getAttribute("aria-expanded")).toBe("false");
    });

    it("opens delete dialog from the more actions menu", () => {
        renderCard(baseChart);

        expect(screen.queryByRole("dialog")).toBeNull();
        fireEvent.click(screen.getByLabelText(/more actions/i));
        fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
        expect(screen.getByRole("dialog")).not.toBeNull();
    });

    it("starts rename on double-clicking the title", () => {
        renderCard(baseChart);

        fireEvent.doubleClick(screen.getByText("My KM"));
        expect(screen.getByDisplayValue("My KM")).not.toBeNull();
    });
});
