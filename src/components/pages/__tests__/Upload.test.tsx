// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider } from "@/app/providers";
import { Upload } from "@/components/pages/Upload";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const FILE = "subject,glucose,visit_date\nS1,5.4,2025-01-01\nS2,6.1,2025-02-01\nS3,5.8,2025-03-01\n";

const csvFile = (text: string, name: string): File =>
    new File([text], name, { type: "text/csv" });

const renderPage = (): HTMLInputElement => {
    render(
        <AppStateProvider>
            <Upload />
        </AppStateProvider>,
    );

    return document.querySelector('input[type="file"]') as HTMLInputElement;
};

const mappingInStorage = (): unknown => {
    const raw = window.sessionStorage.getItem("loupe.mapping");

    return raw === null ? null : JSON.parse(raw);
};

const namesInStorage = (): readonly string[] => {
    const raw = window.sessionStorage.getItem("loupe.dataset");
    if (raw === null) {
        return [];
    }

    return (JSON.parse(raw) as readonly { name: string }[]).map((c) => c.name);
};

beforeEach(() => {
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

describe("Upload parse-success wiring", () => {
    it("parse-success effect resets a stale mapping AND replaces persisted dataset", async () => {
        // Seed a stale mapping from a prior session — provider hydrates this into state.
        window.sessionStorage.setItem(
            "loupe.mapping",
            JSON.stringify({ time: "time_to_event_months" }),
        );
        const input = renderPage();

        await act(async () => {
            fireEvent.change(input, { target: { files: [csvFile(FILE, "b.csv")] } });
        });
        await waitFor(() => {
            expect(window.sessionStorage.getItem("loupe.dataset")).not.toBeNull();
        });

        // Both effects must have fired: dataset = new file, mapping = {}.
        expect(namesInStorage()).toEqual(["subject", "glucose", "visit_date"]);
        expect(mappingInStorage()).toEqual({});
    });
});
