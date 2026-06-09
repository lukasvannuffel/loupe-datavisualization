// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteChartButton } from "@/app/dashboard/DeleteChartButton";
import { ToastProvider } from "@/components/ui/ToastProvider";

const deleteChartMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/charts/actions", () => ({
    deleteChart: deleteChartMock,
}));

afterEach(() => {
    cleanup();
    deleteChartMock.mockReset();
    document.body.classList.remove("is-locked");
});

describe("DeleteChartButton", () => {
    it("calls deleteChart only on confirm", async () => {
        deleteChartMock.mockResolvedValue({ success: true });
        render(
            <ToastProvider>
                <DeleteChartButton chartId="1" chartName="Test" />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByLabelText(/delete test/i));
        expect(screen.getByRole("dialog")).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(deleteChartMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText(/delete test/i));
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        await waitFor(() => {
            expect(deleteChartMock).toHaveBeenCalledWith("1");
        });
    });

    it("notifies onDeleted without locking the page scroll", async () => {
        const onDeleted = vi.fn();
        deleteChartMock.mockResolvedValue({ success: true });

        render(
            <ToastProvider>
                <DeleteChartButton chartId="42" chartName="KM" onDeleted={onDeleted} />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByLabelText(/delete km/i));
        expect(document.body.classList.contains("is-locked")).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        await waitFor(() => {
            expect(onDeleted).toHaveBeenCalledWith("42");
        });
        expect(document.body.classList.contains("is-locked")).toBe(false);
    });
});
