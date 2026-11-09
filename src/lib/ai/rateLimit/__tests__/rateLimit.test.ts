import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkAndRecord, releaseSlot } from "../rateLimit";
import type { ActorKey } from "../rateLimit.types";

const ACTOR = "user:test-actor" as ActorKey;
const RECORD_ID = 42;

const selectMock = vi.fn();
const insertMock = vi.fn();
const insertSingleMock = vi.fn();
const deleteEqMock = vi.fn();
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));

const tableMock = () => ({
    delete: deleteMock,
    insert: insertMock,
    select: selectMock,
});

const createSupabaseAdminClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/supabase/admin", () => ({
    createSupabaseAdminClient: createSupabaseAdminClientMock,
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
        insertMock.mockReturnValue({ select: () => ({ single: insertSingleMock }) });
        insertSingleMock.mockResolvedValue({ data: { id: RECORD_ID }, error: null });
        createSupabaseAdminClientMock.mockImplementation(() => ({ from: tableMock }));
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("allows with remaining 19 when window is empty and returns the inserted record id", async () => {
        chainSelect([]);

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, recordId: RECORD_ID, remaining: 19 });
        expect(insertMock).toHaveBeenCalledWith({ actor_key: ACTOR });
    });

    it("allows with remaining 0 when 19 prior calls exist", async () => {
        const rows = Array.from({ length: 19 }, (_, i) => ({
            called_at: new Date(Date.now() - i * 1000).toISOString(),
        }));
        chainSelect(rows);

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, recordId: RECORD_ID, remaining: 0 });
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

        expect(result).toEqual({ allowed: true, recordId: null, remaining: 20 });
        expect(console.error).toHaveBeenCalled();
        expect(insertMock).not.toHaveBeenCalled();
    });

    it("fails open when admin client cannot be created", async () => {
        createSupabaseAdminClientMock.mockImplementationOnce(() => {
            throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
        });

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, recordId: null, remaining: 20 });
        expect(console.error).toHaveBeenCalledWith(
            "[ai] rate limit admin client unavailable",
            expect.any(Error),
        );
        expect(insertMock).not.toHaveBeenCalled();
    });

    it("still allows with a null record id when insert fails after count check", async () => {
        chainSelect([]);
        insertSingleMock.mockResolvedValue({ data: null, error: { message: "insert failed" } });

        const result = await checkAndRecord(ACTOR);

        expect(result).toEqual({ allowed: true, recordId: null, remaining: 19 });
        expect(console.error).toHaveBeenCalled();
    });
});

describe("releaseSlot", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        deleteEqMock.mockResolvedValue({ error: null });
        createSupabaseAdminClientMock.mockImplementation(() => ({ from: tableMock }));
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("deletes exactly the recorded row by id", async () => {
        await releaseSlot(RECORD_ID);

        expect(deleteMock).toHaveBeenCalledTimes(1);
        expect(deleteEqMock).toHaveBeenCalledWith("id", RECORD_ID);
    });

    it("does nothing when no row was recorded", async () => {
        await releaseSlot(null);

        expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
    });

    it("logs instead of throwing when the delete fails", async () => {
        deleteEqMock.mockResolvedValue({ error: { message: "delete failed" } });

        await expect(releaseSlot(RECORD_ID)).resolves.toBeUndefined();
        expect(console.error).toHaveBeenCalledWith("[ai] rate limit release failed", { message: "delete failed" });
    });

    it("logs instead of throwing when the admin client cannot be created", async () => {
        createSupabaseAdminClientMock.mockImplementationOnce(() => {
            throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
        });

        await expect(releaseSlot(RECORD_ID)).resolves.toBeUndefined();
        expect(console.error).toHaveBeenCalledWith(
            "[ai] rate limit admin client unavailable",
            expect.any(Error),
        );
    });
});
