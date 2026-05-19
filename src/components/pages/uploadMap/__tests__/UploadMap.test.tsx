// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider } from "@/app/providers";
import { toAiColumns } from "@/lib/ai/toAiColumns";
import type { ColumnInference } from "@/lib/parser/inference.types";
import type { Receipt } from "@/lib/chartSpec/types";

import { UploadMap } from "../UploadMap";

const push = vi.fn();
const replace = vi.fn();

const recommendChartMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/recommendChart", () => ({
    recommendChart: recommendChartMock,
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
}));

const col = (
    over: Partial<ColumnInference> & Pick<ColumnInference, "name" | "primaryType">,
): ColumnInference => ({
    confidence: 1,
    reasons: [],
    nullCount: 0,
    uniqueCount: 10,
    sampleValues: [],
    ...over,
});

const KM_DATASET: readonly ColumnInference[] = [
    col({ name: "patient_id", primaryType: "categorical", semanticTag: "patient-id" }),
    col({ name: "treatment_arm", primaryType: "categorical", uniqueCount: 2 }),
    col({ name: "age_at_baseline", primaryType: "numeric", nullCount: 12 }),
    col({ name: "stage", primaryType: "categorical", uniqueCount: 4, nullCount: 7 }),
    col({
        name: "time_to_event_months",
        primaryType: "numeric",
        semanticTag: "time-to-event",
    }),
    col({
        name: "event_observed",
        primaryType: "binary",
        semanticTag: "event-status",
    }),
];

const MOCK_RECEIPT: Receipt = {
    alternatives: [],
    intent: "Compare survival between arms",
    overrides: [],
    recommendation: {
        because: "Because text.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier curve",
        handles: "Handles text.",
        handlesTitle: "Handles",
        headline: "Headline.",
    },
    selectionMode: "ai",
    tests: [],
    testsTitle: "Tests",
    transformations: [],
};

const seedDataset = (dataset: readonly ColumnInference[] | null): void => {
    if (dataset === null) {
        window.sessionStorage.clear();
        return;
    }
    window.sessionStorage.setItem("loupe.dataset", JSON.stringify(dataset));
};

const renderPage = (): void => {
    act(() => {
        render(
            <AppStateProvider>
                <UploadMap />
            </AppStateProvider>,
        );
    });
};

const getSelect = (columnName: string): HTMLSelectElement =>
    screen.getByLabelText(`Chart role for ${columnName}`) as HTMLSelectElement;

const continueButton = (): HTMLButtonElement =>
    screen.getByRole("button", { name: /Get recommendation/ }) as HTMLButtonElement;

beforeEach(() => {
    vi.useRealTimers();
    push.mockClear();
    replace.mockClear();
    recommendChartMock.mockReset();
    recommendChartMock.mockResolvedValue({
        chartType: "km",
        costEstimateEur: 0.01,
        ok: true,
        receipt: MOCK_RECEIPT,
    });
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

describe("UploadMap", () => {
    it("redirects to /upload when no dataset is present", () => {
        seedDataset(null);
        renderPage();
        expect(replace).toHaveBeenCalledWith("/upload");
    });

    it("auto-maps a KM-shaped dataset on mount", () => {
        seedDataset(KM_DATASET);
        renderPage();
        expect(getSelect("patient_id").value).toBe("id");
        expect(getSelect("treatment_arm").value).toBe("group");
        expect(getSelect("time_to_event_months").value).toBe("time");
        expect(getSelect("event_observed").value).toBe("event");
    });

    it("does NOT redirect to /upload when a dataset is persisted (hydration-race guard)", () => {
        seedDataset(KM_DATASET);
        renderPage();
        expect(replace).not.toHaveBeenCalledWith("/upload");
    });

    it("changing time from one column to another reverts the old one to Ignore", () => {
        seedDataset(KM_DATASET);
        renderPage();
        expect(getSelect("time_to_event_months").value).toBe("time");
        fireEvent.change(getSelect("age_at_baseline"), { target: { value: "time" } });
        expect(getSelect("age_at_baseline").value).toBe("time");
        expect(getSelect("time_to_event_months").value).toBe("ignore");
    });

    it("reassigning group from A to B reverts A to Ignore", () => {
        seedDataset(KM_DATASET);
        renderPage();
        expect(getSelect("treatment_arm").value).toBe("group");
        fireEvent.change(getSelect("stage"), { target: { value: "group" } });
        expect(getSelect("stage").value).toBe("group");
        expect(getSelect("treatment_arm").value).toBe("ignore");
    });

    it("Continue is disabled with valid mapping but empty intent", () => {
        seedDataset(KM_DATASET);
        renderPage();
        expect(continueButton().disabled).toBe(true);
    });

    it("Continue calls recommendChart then navigates to /recommend with receipt + chartKind", async () => {
        seedDataset(KM_DATASET);
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        expect(continueButton().disabled).toBe(false);
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });

        const mappingRaw = window.sessionStorage.getItem("loupe.mapping");
        expect(mappingRaw).not.toBeNull();
        const datasetRaw = window.sessionStorage.getItem("loupe.dataset");
        expect(datasetRaw).not.toBeNull();
        const parsedDataset = JSON.parse(datasetRaw as string) as ColumnInference[];
        const expectedPayload = {
            columns: toAiColumns(parsedDataset),
            intent: "Compare survival between arms",
            mapping: JSON.parse(mappingRaw as string),
        };

        expect(JSON.parse(JSON.stringify(recommendChartMock.mock.calls[0]?.[0]))).toEqual(
            JSON.parse(JSON.stringify(expectedPayload)),
        );

        expect(push).toHaveBeenCalledWith("/recommend");
        expect(window.sessionStorage.getItem("loupe.receipt")).not.toBeNull();
        expect(window.sessionStorage.getItem("loupe.chartKind")).toBe(JSON.stringify("km"));
    });

    it("second identical recommendation skips the server action (session cache hit)", async () => {
        seedDataset(KM_DATASET);
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });
        push.mockClear();
        await waitFor(() => {
            expect(continueButton().textContent).toMatch(/Get recommendation/);
        });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });
        expect(push.mock.calls.length).toBeGreaterThan(0);
    });

    it("changes intent hash so the server action runs again", async () => {
        seedDataset(KM_DATASET);
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "First intent" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(continueButton().textContent).toMatch(/Get recommendation/);
        });
        fireEvent.change(textarea, { target: { value: "Second intent" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(2);
        });
    });

    it("changes a mapping value so the server action runs again", async () => {
        seedDataset(KM_DATASET);
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
            expect(continueButton().textContent).toMatch(/Get recommendation/);
        });
        fireEvent.change(getSelect("age_at_baseline"), { target: { value: "time" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(2);
        });
    });

    it("PHI rename updates dataset column names and follows mapping roles", async () => {
        const phiDataset: readonly ColumnInference[] = [
            col({ name: "first_name", primaryType: "categorical", uniqueCount: 5 }),
            col({ name: "score", primaryType: "numeric", uniqueCount: 10 }),
        ];
        seedDataset(phiDataset);
        window.sessionStorage.setItem("loupe.mapping", JSON.stringify({ id: "first_name" }));
        renderPage();

        expect(screen.getByText(/column name\(s\) look sensitive/i)).not.toBeNull();

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Rename" }));
        });

        const input = screen.getByDisplayValue("first_name");
        fireEvent.change(input, { target: { value: "subject_label" } });

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Save names" }));
        });

        const stored = window.sessionStorage.getItem("loupe.dataset");
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored as string) as ColumnInference[];
        expect(parsed[0]?.name).toBe("subject_label");

        const mappingJson = window.sessionStorage.getItem("loupe.mapping");
        expect(mappingJson).not.toBeNull();
        expect(JSON.parse(mappingJson as string)).toEqual({ id: "subject_label" });

        expect(screen.queryByText(/column name\(s\) look sensitive/i)).toBeNull();
    });

    it("PHI batched rename updates two columns and mapping roles together", async () => {
        const phiDataset: readonly ColumnInference[] = [
            col({ name: "email", primaryType: "categorical", uniqueCount: 5 }),
            col({ name: "Phone", primaryType: "categorical", uniqueCount: 3 }),
            col({ name: "score", primaryType: "numeric", uniqueCount: 10 }),
        ];
        seedDataset(phiDataset);
        window.sessionStorage.setItem("loupe.mapping", JSON.stringify({ group: "Phone", id: "email" }));
        renderPage();

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Rename" }));
        });

        fireEvent.change(screen.getByDisplayValue("email"), { target: { value: "contact_bucket" } });
        fireEvent.change(screen.getByDisplayValue("Phone"), { target: { value: "phone_bucket" } });

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Save names/i }));
        });

        const storedDataset = window.sessionStorage.getItem("loupe.dataset");
        expect(storedDataset).not.toBeNull();
        const parsedDataset = JSON.parse(storedDataset as string) as ColumnInference[];
        const names = parsedDataset.map((c) => c.name).sort();

        expect(names).toContain("contact_bucket");
        expect(names).toContain("phone_bucket");

        const mappingJson = window.sessionStorage.getItem("loupe.mapping");
        expect(mappingJson).not.toBeNull();
        expect(JSON.parse(mappingJson as string)).toEqual({
            group: "phone_bucket",
            id: "contact_bucket",
        });
    });

    it("Continue stays disabled after Cancel hides PHI warning", () => {
        seedDataset([
            col({ name: "email", primaryType: "categorical", uniqueCount: 10 }),
            col({ name: "score", primaryType: "numeric", uniqueCount: 5 }),
        ]);
        renderPage();
        fireEvent.change(getSelect("score"), { target: { value: "y" } });
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare scores" } });
        expect(continueButton().disabled).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
        expect(screen.queryByText(/column name\(s\) look sensitive/i)).toBeNull();
        expect(continueButton().disabled).toBe(true);
    });

    it("Continue stays disabled while PHI warning is unresolved", () => {
        seedDataset([
            col({ name: "email", primaryType: "categorical", uniqueCount: 10 }),
            col({ name: "score", primaryType: "numeric", uniqueCount: 5 }),
        ]);
        renderPage();
        fireEvent.change(getSelect("score"), { target: { value: "y" } });
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare scores" } });
        expect(continueButton().disabled).toBe(true);
    });

    it("disables Try again when rate limited but keeps Pick chart manually enabled", async () => {
        seedDataset(KM_DATASET);
        recommendChartMock.mockResolvedValueOnce({
            code: "RATE_LIMITED",
            message: "Too many recommendations in the last hour. Try again in 45 minutes.",
            ok: false,
        });
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(screen.getByText(/Too many recommendations/i)).toBeTruthy();
        });
        const tryAgain = screen.getByRole("button", { name: /Try again/i });
        const manual = screen.getByRole("button", { name: /Pick chart manually/i });
        expect(tryAgain).toBeDisabled();
        expect(manual).not.toBeDisabled();
        expect(continueButton().disabled).toBe(true);
        expect(recommendChartMock).toHaveBeenCalledTimes(1);
    });

    it("shows error card and Try again on upstream failure", async () => {
        seedDataset(KM_DATASET);
        recommendChartMock.mockResolvedValueOnce({
            code: "UPSTREAM_FAILURE",
            message: "AI gateway upstream error.",
            ok: false,
        });
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(screen.getByText(/Couldn.*generate a recommendation/i)).not.toBeNull();
        });
        await act(async () => {
            recommendChartMock.mockResolvedValueOnce({
                chartType: "km",
                costEstimateEur: 0.01,
                ok: true,
                receipt: MOCK_RECEIPT,
            });
            fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
        });
        await waitFor(() => {
            expect(recommendChartMock.mock.calls.length).toBeGreaterThanOrEqual(2);
        });
    });

    it("Pick chart manually sets manual mode and navigates to /recommend/manual", async () => {
        seedDataset(KM_DATASET);
        recommendChartMock.mockResolvedValueOnce({
            code: "UPSTREAM_FAILURE",
            message: "AI gateway upstream error.",
            ok: false,
        });
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        await act(async () => {
            continueButton().click();
        });
        await waitFor(() => {
            expect(screen.getByText(/Couldn.*generate a recommendation/i)).toBeTruthy();
        });
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Pick chart manually/i }));
        });
        await waitFor(() => {
            expect(push).toHaveBeenCalledWith("/recommend/manual");
        });
        expect(window.sessionStorage.getItem("loupe.selectionMode")).toBe("manual");
    });

    it("validation strip text mirrors validateMapping output", () => {
        seedDataset(KM_DATASET);
        renderPage();
        expect(screen.getByRole("status").textContent).toContain("4 roles mapped");
    });

    it("Replace file clears state and navigates to /upload", () => {
        seedDataset(KM_DATASET);
        renderPage();
        act(() => screen.getByRole("button", { name: /Replace file/ }).click());
        expect(push).toHaveBeenCalledWith("/upload");
        expect(window.sessionStorage.getItem("loupe.dataset")).toBeNull();
    });
});
