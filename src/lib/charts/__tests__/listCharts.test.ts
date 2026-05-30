import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, createClientMock } = vi.hoisted(() => ({
    cookiesMock: vi.fn(async () => ({})),
    createClientMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: cookiesMock,
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: createClientMock,
}));
vi.mock("server-only", () => ({}));

import { listCharts } from "@/lib/charts/listCharts";

const createSupabaseMock = (options?: { authUserId?: string | null; selectError?: string }) => {
    const orderMock = vi.fn(async () =>
        options?.selectError !== undefined
            ? { data: null, error: { message: options.selectError } }
            : {
                data: [
                    {
                        id: "chart-1",
                        name: "Saved chart",
                        chart_kind: "km",
                        thumbnail: "data:image/png;base64,thumb",
                        updated_at: "2026-05-28T08:00:00.000Z",
                        created_at: "2026-05-28T07:00:00.000Z",
                    },
                ],
                error: null,
            },
    );
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
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
            eqMock,
            orderMock,
        },
    };
};

describe("listCharts", () => {
    beforeEach(() => {
        createClientMock.mockReset();
        cookiesMock.mockClear();
    });

    it("returns unauthenticated when no user", async () => {
        const { client } = createSupabaseMock({ authUserId: null });
        createClientMock.mockReturnValue(client);

        const result = await listCharts();

        expect(result).toEqual({ error: "unauthenticated", ok: false });
    });

    it("scopes the query by user_id", async () => {
        const { client, mocks } = createSupabaseMock();
        createClientMock.mockReturnValue(client);

        await listCharts();

        expect(mocks.eqMock).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("returns fetch_failed when the supabase client throws", async () => {
        createClientMock.mockImplementationOnce(() => {
            throw new Error("connection lost");
        });

        const result = await listCharts();

        expect(result).toEqual({ error: "fetch_failed", ok: false });
    });

    it("returns fetch_failed when the query errors", async () => {
        const { client } = createSupabaseMock({ selectError: "timeout" });
        createClientMock.mockReturnValue(client);

        const result = await listCharts();

        expect(result).toEqual({ error: "fetch_failed", ok: false });
    });

    it("returns charts when the query succeeds", async () => {
        const { client } = createSupabaseMock();
        createClientMock.mockReturnValue(client);

        const result = await listCharts();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.charts).toHaveLength(1);
            expect(result.charts[0]?.id).toBe("chart-1");
        }
    });

    // MUTATION-VERIFY:
    //   In src/lib/charts/listCharts.ts, remove the exact line:
    //   `.eq("user_id", user.id)`.
    //   Re-run "scopes the query by user_id".
    //   `expect(mocks.eqMock).toHaveBeenCalledWith("user_id", "user-123")` fails -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/charts/listCharts.ts, remove the outer `try { ... } catch { ... }` wrapper.
    //   Re-run "returns fetch_failed when the supabase client throws".
    //   The thrown error now propagates instead of returning fetch_failed -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.
});
