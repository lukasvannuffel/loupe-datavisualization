// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";

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

const seedDataset = (
    dataset: readonly ColumnInference[] | null,
    rows: ReadonlyArray<Readonly<Record<string, string>>> = [],
): void => {
    if (dataset === null) {
        window.sessionStorage.clear();
        return;
    }
    window.sessionStorage.setItem("loupe.dataset", JSON.stringify(dataset));
    window.sessionStorage.setItem("loupe.datasetRows", JSON.stringify(rows));
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
    screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;

beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    recommendChartMock.mockReset();
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

    // MUTATION-VERIFY: change router.push target in UploadMap.tsx handleContinue from
    // "/recommend/choose" to "/recommend" → this test goes RED.
    // Verified manually: 2026-06-01. REVERTED.
    it("navigates to /recommend/choose on Continue", () => {
        seedDataset(KM_DATASET);
        renderPage();
        const textarea = screen.getByLabelText("What did you find?") as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "Compare survival between arms" } });
        expect(continueButton().disabled).toBe(false);
        act(() => {
            continueButton().click();
        });
        expect(push).toHaveBeenCalledWith("/recommend/choose");
        expect(recommendChartMock).not.toHaveBeenCalled();
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
