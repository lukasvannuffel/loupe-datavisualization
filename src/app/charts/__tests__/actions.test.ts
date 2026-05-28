import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SaveChartPayload } from "@/app/charts/actions";
import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";
import { resolvePalette } from "@/lib/chartSpec/resolvePalette";
import { methodString } from "@/lib/receipt/methodStrings";
import { sampleString } from "@/lib/receipt/sampleStrings";
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

import { deleteChart, getChart, saveChart } from "@/app/charts/actions";

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

const boxChartSpec: ChartSpec = {
    kind: "box",
    version: 1,
    id: "spec-box",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "Tumor size distribution",
    showLegend: false,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    showOutliers: true,
    showMeanMarker: true,
    notched: false,
};

const scatterChartSpec: ChartSpec = {
    kind: "xy",
    version: 1,
    id: "spec-scatter",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "Biomarker relationship",
    showLegend: false,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    mode: "scatter",
    showRegression: true,
    showErrorBands: false,
};

const longitudinalChartSpec: ChartSpec = {
    ...scatterChartSpec,
    id: "spec-longitudinal",
    title: "Outcome trajectories",
    mode: "line",
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

const boxPlotData: PlotData = {
    kind: "box",
    groups: [
        {
            kind: "box",
            label: "Stage I",
            n: 10,
            min: 1,
            q1: 2,
            median: 3,
            q3: 4,
            max: 5,
            notchLower: 2.6,
            notchUpper: 3.4,
            outliers: [8],
            mean: 3.2,
        },
    ],
    yMin: 1,
    yMax: 8,
};

const scatterPlotData: PlotData = {
    kind: "xy",
    groups: [{ label: "All", points: [{ x: 1, y: 2 }] }],
    regressions: [],
    regressionSkipped: false,
    xMin: 1,
    xMax: 1,
    yMin: 2,
    yMax: 2,
};

const longitudinalPlotData: PlotData = {
    kind: "longitudinal",
    groups: [
        {
            label: "Arm A",
            points: [{ visit: 1, mean: 1.1, sem: 0.2, n: 10 }],
        },
    ],
    xMin: 1,
    xMax: 1,
    yMin: 1.1,
    yMax: 1.1,
};

const createSupabaseMock = (
    options?: {
        authUserId?: string | null;
        insertError?: string;
        updateError?: string;
        getError?: string;
        deleteError?: string;
        getDataOverride?: Record<string, unknown>;
    },
) => {
    const singleMock = vi.fn(async () =>
        options?.insertError !== undefined
            ? { data: null, error: { message: options.insertError } }
            : { data: { id: "new-chart-id" }, error: null },
    );
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    const singleUpdateMock = vi.fn(async () =>
        options?.updateError !== undefined
            ? { data: null, error: { message: options.updateError } }
            : { data: { id: "updated-chart-id" }, error: null },
    );
    const selectUpdateMock = vi.fn(() => ({ single: singleUpdateMock }));
    const matchMock = vi.fn(() => ({ select: selectUpdateMock }));
    const updateMock = vi.fn(() => ({ match: matchMock }));
    const singleGetMock = vi.fn(async () =>
        options?.getError !== undefined
            ? { data: null, error: { message: options.getError } }
            : {
                data: {
                    id: "chart-1",
                    name: "Saved chart",
                    chart_kind: "km",
                    thumbnail: "data:image/png;base64,thumb",
                    chart_spec: chartSpec,
                    column_mapping: { time: "time_months", event: "event_status", group: "arm" },
                    receipt: {
                        generated_at: new Date().toISOString(),
                        config_hash: "sha256·abcdef12…beef",
                        method: "Kaplan-Meier estimator, Greenwood log-log CI",
                        sample: "n = 100 · censored = 0",
                        palette: "editorial",
                        software: "Loupe v0.1.0 · client-side",
                        ai_rationale: "Time-to-event with censoring and treatment groups.",
                        csv_columns: ["time_months", "event_status", "arm"],
                        n_rows_input: 100,
                    },
                    plot_data: plotData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...options?.getDataOverride,
                },
                error: null,
            },
    );
    const eqSecondMock = vi.fn(() => ({ single: singleGetMock }));
    const eqFirstMock = vi.fn(() => ({ eq: eqSecondMock, single: singleGetMock }));
    const selectGetMock = vi.fn(() => ({ eq: eqFirstMock }));
    const eqDeleteSecondMock = vi.fn(async () =>
        options?.deleteError !== undefined
            ? { error: { message: options.deleteError } }
            : { error: null },
    );
    const eqDeleteFirstMock = vi.fn(() => ({ eq: eqDeleteSecondMock }));
    const deleteMock = vi.fn(() => ({ eq: eqDeleteFirstMock }));
    const fromMock = vi.fn(() => ({
        insert: insertMock,
        update: updateMock,
        select: selectGetMock,
        delete: deleteMock,
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
            selectUpdateMock,
            singleUpdateMock,
            selectMock,
            singleMock,
            selectGetMock,
            eqFirstMock,
            eqSecondMock,
            singleGetMock,
            deleteMock,
            eqDeleteFirstMock,
            eqDeleteSecondMock,
            updateMock,
        },
    };
};

const createValidPayload = async (
    overrides?: {
        chartSpec?: ChartSpec;
        plotData?: PlotData;
    },
): Promise<SaveChartPayload> => {
    const nextChartSpec = overrides?.chartSpec ?? chartSpec;
    const nextPlotData = overrides?.plotData ?? plotData;
    const hash = await computeConfigHash(nextChartSpec);
    const receipt: Receipt = {
        generated_at: new Date().toISOString(),
        config_hash: hash,
        method: methodString(nextChartSpec.kind),
        sample: sampleString(nextChartSpec, nextPlotData),
        palette: resolvePalette(nextChartSpec),
        software: "Loupe v0.1.0 · client-side",
        ai_rationale: "Time-to-event with censoring and treatment groups.",
        csv_columns: ["time_months", "event_status", "arm"],
        n_rows_input: 100,
    };

    return {
        name: "KM chart",
        chart_spec: nextChartSpec,
        column_mapping: {
            time: "time_months",
            event: "event_status",
            group: "arm",
        },
        receipt,
        plot_data: nextPlotData,
        thumbnail: "data:image/png;base64,thumb",
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
                groups: payload.plot_data.groups.map((group, index) =>
                    index === 0
                        ? { ...group, patient_id: "P001" }
                        : group,
                ),
            } as unknown as PlotData,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/forbidden key "patient_id"/i);
        }
    });

    it("rejects tampered receipt.method", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: { ...payload.receipt, method: "Pearson correlation, t-test" },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/method/i);
        }
    });

    it("rejects tampered receipt.sample", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: { ...payload.receipt, sample: "n = 999999 · censored = 0" },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/sample/i);
        }
    });

    it("rejects tampered receipt.software", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: { ...payload.receipt, software: "Loupe v999.0.0 · server-side" },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/software/i);
        }
    });

    it("rejects tampered receipt.palette", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: { ...payload.receipt, palette: "wong" },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/palette/i);
        }
    });

    it("rejects tampered receipt.csv_columns", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: { ...payload.receipt, csv_columns: ["fake_column"] },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/csv_columns/i);
        }
    });

    it("rejects receipt.generated_at outside ±5 min window", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const result = await saveChart({
            ...payload,
            receipt: {
                ...payload.receipt,
                generated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            },
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/generated_at|window/i);
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

    it("stores null plot_data for box charts", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload({
            chartSpec: boxChartSpec,
            plotData: boxPlotData,
        });

        await saveChart(payload);

        expect(mocks.insertMock).toHaveBeenCalledWith(
            expect.objectContaining({ plot_data: null, chart_kind: "box" }),
        );
    });

    it("stores null plot_data for scatter charts", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload({
            chartSpec: scatterChartSpec,
            plotData: scatterPlotData,
        });

        await saveChart(payload);

        expect(mocks.insertMock).toHaveBeenCalledWith(
            expect.objectContaining({ plot_data: null, chart_kind: "xy" }),
        );
    });

    it("stores plot_data for KM charts", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        await saveChart(payload);

        expect(mocks.insertMock).toHaveBeenCalledWith(
            expect.objectContaining({
                plot_data: expect.objectContaining({ kind: "km" }),
                chart_kind: "km",
            }),
        );
    });

    it("stores plot_data for xy longitudinal charts", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload({
            chartSpec: longitudinalChartSpec,
            plotData: longitudinalPlotData,
        });

        await saveChart(payload);

        expect(mocks.insertMock).toHaveBeenCalledWith(
            expect.objectContaining({
                plot_data: expect.objectContaining({ kind: "longitudinal" }),
                chart_kind: "xy",
            }),
        );
    });

    it('calls revalidatePath("/dashboard") on success', async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        await saveChart(payload);

        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    });

    it("does not call revalidatePath when validation fails", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        await saveChart({
            ...payload,
            receipt: { ...payload.receipt, method: "tampered" },
        });

        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("accepts trusted receipt fields n_rows_input and ai_rationale", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);
        const payload = await createValidPayload();

        const first = await saveChart({
            ...payload,
            receipt: {
                ...payload.receipt,
                n_rows_input: 100,
                ai_rationale: "A",
            },
        });
        const second = await saveChart({
            ...payload,
            receipt: {
                ...payload.receipt,
                n_rows_input: 200,
                ai_rationale: "B",
            },
        });

        expect(first.success).toBe(true);
        expect(second.success).toBe(true);
    });

    // MUTATION-VERIFY:
    //   In src/lib/privacy/assertNoRawRows.ts, change FORBIDDEN_KEY_PATTERN to /^__never_match__$/.
    //   Re-run "rejects payload with raw rows in plot_data".
    //   patient_id no longer flagged -> "forbidden key \"patient_id\"" is absent -> test RED.
    //   Verified manually: 2026-05-27. REVERTED.

    // MUTATION-VERIFY:
    //   In src/app/charts/actions.ts, delete the exact guard block:
    //   `if (recomputedHash !== parsed.receipt.config_hash) { return { success: false, error: ... }; }`.
    //   Re-run "rejects when client config_hash does not match server recomputation".
    //   Mismatched hash is now accepted -> test RED.
    //   Verified manually: 2026-05-27. REVERTED.

    // MUTATION-VERIFY:
    //   In src/app/charts/actions.ts isPlotDataStorable, mutate only the box branch:
    //   `if (chartKind === "box") { return false; }` -> `if (chartKind === "box") { return true; }`.
    //   Re-run "stores null plot_data for box charts".
    //   Box plot_data is now stored instead of nulled -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.
});

describe("getChart and deleteChart", () => {
    beforeEach(() => {
        createClientMock.mockReset();
        revalidatePathMock.mockClear();
    });

    it("getChart returns a row when found", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart?.id).toBe("chart-1");
        expect(mocks.eqSecondMock).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("getChart returns null when missing", async () => {
        const { client } = createSupabaseMock({ getError: "not found" });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("missing");

        expect(chart).toBeNull();
    });

    it("getChart returns null when no authenticated user", async () => {
        const { client } = createSupabaseMock({ authUserId: null });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).toBeNull();
    });

    it("getChart returns null when chart_spec fails schema validation", async () => {
        const { client } = createSupabaseMock({
            getDataOverride: { chart_spec: { kind: "bogus" } },
        });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).toBeNull();
    });

    it("getChart returns null when receipt fails schema validation", async () => {
        const { client } = createSupabaseMock({
            getDataOverride: { receipt: { bogus: true } },
        });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).toBeNull();
    });

    it("getChart returns null when chart_kind is unknown", async () => {
        const { client } = createSupabaseMock({
            getDataOverride: { chart_kind: "pie" },
        });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).toBeNull();
    });

    it("getChart returns null when column_mapping fails schema validation", async () => {
        const { client } = createSupabaseMock({
            getDataOverride: { column_mapping: { bogus: 123 } },
        });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).toBeNull();
    });

    it("getChart returns null when loaded plot_data contains a forbidden key", async () => {
        const { client } = createSupabaseMock({
            getDataOverride: {
                plot_data: {
                    ...plotData,
                    groups: [{ ...plotData.groups[0], patient_id: "P001" }],
                },
            },
        });
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).toBeNull();
    });

    it("getChart returns the row when loaded plot_data is clean", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);

        const chart = await getChart("chart-1");

        expect(chart).not.toBeNull();
    });

    // MUTATION-VERIFY:
    //   In src/app/charts/actions.ts getChart, remove the exact line:
    //   `.eq("user_id", user.id)`.
    //   Re-run "getChart returns a row when found".
    //   `expect(mocks.eqSecondMock).toHaveBeenCalledWith("user_id", "user-123")` fails -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.

    // MUTATION-VERIFY:
    //   In src/app/charts/actions.ts getChart, comment out the exact line:
    //   `assertNoRawRows(parsedSpec.data, data.plot_data as PlotData);`.
    //   Re-run "getChart returns null when loaded plot_data contains a forbidden key".
    //   Tainted row is returned instead of null -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.

    it("deleteChart deletes scoped to the authenticated user", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);

        const result = await deleteChart("chart-123");

        expect(result.success).toBe(true);
        expect(mocks.deleteMock).toHaveBeenCalledTimes(1);
        expect(mocks.eqDeleteFirstMock).toHaveBeenCalledWith("id", "chart-123");
        expect(mocks.eqDeleteSecondMock).toHaveBeenCalledWith("user_id", "user-123");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    });

    it("deleteChart returns not authenticated without a session", async () => {
        const { client } = createSupabaseMock({ authUserId: null });
        createClientMock.mockReturnValue(client);

        const result = await deleteChart("chart-123");

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toMatch(/not authenticated/i);
        }
    });

    // MUTATION-VERIFY:
    //   In src/app/charts/actions.ts deleteChart, remove `.eq("user_id", user.id)`.
    //   Re-run "deleteChart deletes scoped to the authenticated user".
    //   The user_id scoping assertion fails -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.
});
