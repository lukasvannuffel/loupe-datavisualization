import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SaveChartPayload } from "@/app/charts/actions";
import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";
import { computeConfigHash } from "@/lib/receipt/configHash";
import type { Receipt } from "@/lib/receipt/schemas";

const { cookiesMock, createClientMock, revalidatePathMock } = vi.hoisted(() => ({
    cookiesMock: vi.fn(async () => ({})),
    createClientMock: vi.fn(),
    revalidatePathMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: cookiesMock,
}));

vi.mock("next/cache", () => ({
    revalidatePath: revalidatePathMock,
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: createClientMock,
}));

import { saveChart } from "@/app/charts/actions";

const chartSpec: ChartSpec = {
    kind: "km",
    version: 1,
    id: "spec-km",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "Overall survival",
    showLegend: true,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    legendA: "Arm A",
    dashB: false,
    showAtRisk: true,
    showStats: true,
    timeUnit: "months",
};

const plotData: PlotData = {
    kind: "km",
    tMax: 24,
    groups: [
        {
            label: "Arm A",
            nTotal: 100,
            nEvents: 30,
            points: [{ t: 1, survival: 0.95, nAtRisk: 100, censored: false, ciLower: 0.9, ciUpper: 1 }],
            atRiskTicks: [{ t: 0, nAtRisk: 100 }],
        },
    ],
};

const createSupabaseMock = (options?: { authUserId?: string | null; insertError?: string; updateError?: string }) => {
    const singleMock = vi.fn(async () =>
        options?.insertError !== undefined
            ? { data: null, error: { message: options.insertError } }
            : { data: { id: "new-chart-id" }, error: null },
    );
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    const matchMock = vi.fn(async () =>
        options?.updateError !== undefined ? { error: { message: options.updateError } } : { error: null },
    );
    const updateMock = vi.fn(() => ({ match: matchMock }));
    const fromMock = vi.fn(() => ({
        insert: insertMock,
        update: updateMock,
    }));
    const getUserMock = vi.fn(async () =>
        options?.authUserId === null
            ? { data: { user: null }, error: null }
            : { data: { user: { id: options?.authUserId ?? "user-123" } }, error: null },
    );

    return {
        client: {
            auth: { getUser: getUserMock },
            from: fromMock,
        },
        mocks: {
            fromMock,
            getUserMock,
            insertMock,
            matchMock,
            selectMock,
            singleMock,
            updateMock,
        },
    };
};

const createValidPayload = async (): Promise<SaveChartPayload> => {
    const hash = await computeConfigHash(chartSpec);
    const receipt: Receipt = {
        generated_at: "2026-05-27T12:00:00.000Z",
        config_hash: hash,
        method: "Kaplan-Meier estimator, Greenwood log-log CI",
        sample: "n = 100 · censored = 0",
        palette: "editorial",
        software: "Loupe v0.1.0 · client-side",
        ai_rationale: "Time-to-event with censoring and treatment groups.",
        csv_columns: ["time_months", "event_status", "arm"],
        n_rows_input: 100,
    };

    return {
        name: "KM chart",
        chart_spec: chartSpec,
        column_mapping: {
            time: "time_months",
            event: "event_status",
            group: "arm",
        },
        receipt,
        plot_data: plotData,
    };
};

describe("saveChart", () => {
    beforeEach(() => {
        cookiesMock.mockClear();
        createClientMock.mockReset();
        revalidatePathMock.mockClear();
    });

    it("saves a valid chart and returns success with id", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart(payload);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.id).toBe("new-chart-id");
        }
    });

    it("rejects payload with malformed chart_spec", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            chart_spec: { kind: "invalid" } as unknown as ChartSpec,
        });

        expect(result.success).toBe(false);
    });

    it("rejects payload with raw rows in plot_data", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            plot_data: {
                ...payload.plot_data,
                rawRows: [{ id: 1, event: 1, time: 5 }],
            } as unknown as PlotData,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/privacy|rawRows|row/i);
        }
    });

    it("rejects when client config_hash does not match server recomputation", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: {
                ...payload.receipt,
                config_hash: "sha256·deadbe…ef00",
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/config_hash/i);
        }
    });

    it("returns not authenticated when no user session", async () => {
        const { client } = createSupabaseMock({ authUserId: null });
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart(payload);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/auth/i);
        }
    });

    it("dispatches to UPDATE when payload.id is present", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        await saveChart({
            ...payload,
            id: "94945d80-8457-4621-8538-ac7b09f5f47a",
        });

        expect(mocks.updateMock).toHaveBeenCalledTimes(1);
        expect(mocks.insertMock).not.toHaveBeenCalled();
    });

    it("dispatches to INSERT when payload.id is absent", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        await saveChart(payload);

        expect(mocks.insertMock).toHaveBeenCalledTimes(1);
        expect(mocks.updateMock).not.toHaveBeenCalled();
    });

    it('calls revalidatePath("/dashboard") on success', async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        await saveChart(payload);

        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    });

    // MUTATION-VERIFY:
    //   In src/app/charts/actions.ts, remove the config_hash mismatch guard.
    //   Re-run "rejects when client config_hash does not match server recomputation".
    //   Mismatched hash is now accepted -> test RED.
    //   Verified manually: 2026-05-27. REVERTED.
});
