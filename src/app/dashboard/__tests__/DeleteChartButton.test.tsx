// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteChartButton } from "@/app/dashboard/DeleteChartButton";

const deleteChartMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/app/charts/actions", () => ({
    deleteChart: deleteChartMock,
}));

describe("DeleteChartButton", () => {
    it("calls deleteChart only on confirm", async () => {
        deleteChartMock.mockResolvedValue({ success: true });
        render(<DeleteChartButton chartId="1" chartName="Test" />);

        fireEvent.click(screen.getByLabelText(/delete test/i));
        expect(screen.getByRole("dialog")).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(deleteChartMock).not.toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText(/delete test/i));
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        expect(deleteChartMock).toHaveBeenCalledWith("1");
    });
});
