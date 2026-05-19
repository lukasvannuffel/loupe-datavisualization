import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkAndRecord } from "../rateLimit";
import type { ActorKey } from "../rateLimit.types";

const ACTOR = "user:test-actor" as ActorKey;

const selectMock = vi.fn();
const insertMock = vi.fn();

vi.mock("@/utils/supabase/admin", () => ({
    createSupabaseAdminClient: () => ({
        from: () => ({
            insert: insertMock,
            select: selectMock,
        }),
    }),
}));

const chainSelect = (rows: { called_at: string }[]) => {
    const chain = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    selectMock.mockReturnValue(chain);

    return chain;
};

describe("checkAndRecord", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        insertMock.mockResolvedValue({ error: null });
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("allows with remaining 19 when window is empty", async () => {
        chainSelect([]);

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, remaining: 19 });
        expect(insertMock).toHaveBeenCalledWith({ actor_key: ACTOR });
    });

    it("allows with remaining 0 when 19 prior calls exist", async () => {
        const rows = Array.from({ length: 19 }, (_, i) => ({
            called_at: new Date(Date.now() - i * 1000).toISOString(),
        }));
        chainSelect(rows);

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, remaining: 0 });
    });

    it("denies when 20 prior calls exist and computes retryAfterSeconds", async () => {
        const oldestMs = Date.now() - 59 * 60 * 1000;
        const rows = Array.from({ length: 20 }, (_, i) => ({
            called_at: new Date(oldestMs + i * 1000).toISOString(),
        }));
        chainSelect(rows);

        const result = await checkAndRecord(ACTOR);

        expect(result.allowed).toBe(false);

        if (!result.allowed) {
            expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(50);
            expect(result.retryAfterSeconds).toBeLessThanOrEqual(70);
        }

        expect(insertMock).not.toHaveBeenCalled();
    });

    it("denies when 21 prior calls exist (defensive)", async () => {
        const rows = Array.from({ length: 21 }, (_, i) => ({
            called_at: new Date(Date.now() - i * 1000).toISOString(),
        }));
        chainSelect(rows);

        const result = await checkAndRecord(ACTOR);

        expect(result.allowed).toBe(false);
        expect(insertMock).not.toHaveBeenCalled();
    });

    it("fails open on Supabase query error", async () => {
        const chain = {
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }),
        };
        selectMock.mockReturnValue(chain);

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, remaining: 20 });
        expect(console.error).toHaveBeenCalled();
        expect(insertMock).not.toHaveBeenCalled();
    });

    it("still allows when insert fails after count check", async () => {
        chainSelect([]);
        insertMock.mockResolvedValue({ error: { message: "insert failed" } });

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, remaining: 19 });
        expect(console.error).toHaveBeenCalled();
    });
});
