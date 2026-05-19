import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getUserMock, headersMock } = vi.hoisted(() => ({
    createClientMock: vi.fn(),
    getUserMock: vi.fn(),
    headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue({}),
    headers: headersMock,
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: createClientMock,
}));

import { resolveActorKey } from "../actorKey";

const hashWithSalt = (ip: string, salt: string): string =>
    createHash("sha256").update(salt).update(ip).digest("hex");

describe("resolveActorKey", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RATE_LIMIT_SALT = "test-salt";
        createClientMock.mockReturnValue({
            auth: { getUser: getUserMock },
        });
        getUserMock.mockResolvedValue({ data: { user: null } });
        headersMock.mockResolvedValue(new Headers());
    });

    it("returns user:uuid for authenticated users", async () => {
        getUserMock.mockResolvedValue({ data: { user: { id: "abc-123" } } });

        const key = await resolveActorKey();

        expect(key).toBe("user:abc-123");
    });

    it("hashes first x-forwarded-for value when unauthenticated", async () => {
        headersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }));

        const key = await resolveActorKey();

        expect(key).toBe(hashWithSalt("1.2.3.4", "test-salt"));
    });

    it("falls back to x-real-ip", async () => {
        headersMock.mockResolvedValue(new Headers({ "x-real-ip": "9.9.9.9" }));

        const key = await resolveActorKey();

        expect(key).toBe(hashWithSalt("9.9.9.9", "test-salt"));
    });

    it("hashes unknown when no IP headers", async () => {
        headersMock.mockResolvedValue(new Headers());

        const key = await resolveActorKey();

        expect(key).toBe(hashWithSalt("unknown", "test-salt"));
    });

    it("produces stable hash for same input", async () => {
        headersMock.mockResolvedValue(new Headers({ "x-real-ip": "1.1.1.1" }));

        const a = await resolveActorKey();
        const b = await resolveActorKey();

        expect(a).toBe(b);
    });

    it("produces different hash when salt changes", async () => {
        headersMock.mockResolvedValue(new Headers({ "x-real-ip": "1.1.1.1" }));

        const a = await resolveActorKey();
        process.env.RATE_LIMIT_SALT = "other-salt";
        const b = await resolveActorKey();

        expect(a).not.toBe(b);
    });

    it("throws when RATE_LIMIT_SALT is missing", async () => {
        delete process.env.RATE_LIMIT_SALT;
        headersMock.mockResolvedValue(new Headers({ "x-real-ip": "1.1.1.1" }));

        await expect(resolveActorKey()).rejects.toThrow("RATE_LIMIT_SALT");
    });
});
