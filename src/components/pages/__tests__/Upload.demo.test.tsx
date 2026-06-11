// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_CONFIGS } from "@/components/pages/Upload.demoConfig";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const VALID_CSV =
    "subject,glucose,visit_date\nS1,5.4,2025-01-01\nS2,6.1,2025-02-01\nS3,5.8,2025-03-01\n";

const KM_DEMO_CSV = `patient_id,arm,age,sex,stage,histology,ecog_ps,os_months,os_event
PT0001,Observation,65,Male,IIB,Squamous cell,0,8.2,1
PT0002,Chemo,61,Female,IIB,Adenocarcinoma,0,8.7,1
PT0003,Chemo,62,Male,IIB,Squamous cell,1,45.7,0
PT0004,Chemo,57,Female,IIB,Squamous cell,0,43.3,0
PT0005,Chemo,77,Male,IIB,Squamous cell,1,47.8,1
PT0006,Chemo,66,Male,IIIA,Adenocarcinoma,0,54.9,0
PT0007,Observation,57,Male,IIB,Squamous cell,1,19.1,1
PT0008,Observation,76,Female,IIB,Adenocarcinoma,0,55.0,0
`;

const csvFile = (text: string, name: string): File =>
    new File([text], name, { type: "text/csv" });

const renderUploadPage = async (demoMode: boolean): Promise<void> => {
    vi.resetModules();

    if (demoMode) {
        vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    } else {
        vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    }

    const [{ Upload }, { AppStateProvider }] = await Promise.all([
        import("@/components/pages/Upload"),
        import("@/app/providers"),
    ]);

    render(
        <AppStateProvider>
            <Upload />
        </AppStateProvider>,
    );
};

beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe("Upload demo launcher", () => {
    it("demo buttons hidden when NEXT_PUBLIC_DEMO_MODE is not true", async () => {
        await renderUploadPage(false);

        expect(screen.queryByRole("button", { name: /Demo 1/i })).toBeNull();
    });

    it("demo buttons render when NEXT_PUBLIC_DEMO_MODE is true", async () => {
        await renderUploadPage(true);

        for (const config of DEMO_CONFIGS) {
            expect(screen.getByRole("button", { name: config.label })).toBeInTheDocument();
        }
    });

    it("clicking Demo 1 fetches the correct CSV path", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => new Blob([KM_DEMO_CSV], { type: "text/csv" }),
        });

        vi.stubGlobal("fetch", fetchMock);

        await renderUploadPage(true);

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /Demo 1 · Kaplan–Meier/i }));
        });

        expect(fetchMock).toHaveBeenCalledWith("/demo/nsclc_adjuvant_trial.csv");
    });

    it("demo buttons are disabled when phase is not empty", async () => {
        await renderUploadPage(true);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;

        await act(async () => {
            fireEvent.change(input, {
                target: { files: [csvFile(VALID_CSV, "manual.csv")] },
            });
        });

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Replace" })).toBeInTheDocument();
        });

        expect(screen.getByRole("button", { name: /Demo 1 · Kaplan–Meier/i })).toBeDisabled();
    });

    it("pending ref is cleared after apply", async () => {
        const kmConfig = DEMO_CONFIGS[0];

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                blob: async () => new Blob([KM_DEMO_CSV], { type: "text/csv" }),
            }),
        );

        const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

        await renderUploadPage(true);

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: kmConfig.label }));
        });

        await waitFor(() => {
            expect(window.sessionStorage.getItem("loupe.dataset")).not.toBeNull();
        });

        await waitFor(() => {
            expect(window.sessionStorage.getItem("loupe.mapping")).toBe(JSON.stringify(kmConfig.mapping));
            expect(window.sessionStorage.getItem("loupe.intent")).toBe(kmConfig.intent);
        });

        const mappingWrites = setItemSpy.mock.calls.filter(([key]) => key === "loupe.mapping").length;
        const intentWrites = setItemSpy.mock.calls.filter(([key]) => key === "loupe.intent").length;

        await act(async () => {
            fireEvent.click(document.body);
        });

        expect(setItemSpy.mock.calls.filter(([key]) => key === "loupe.mapping").length).toBe(mappingWrites);
        expect(setItemSpy.mock.calls.filter(([key]) => key === "loupe.intent").length).toBe(intentWrites);
    });
});
