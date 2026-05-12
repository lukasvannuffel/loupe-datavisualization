import { afterEach, describe, expect, it, vi } from "vitest";

const { pingModelMock } = vi.hoisted(() => ({
    pingModelMock: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
    pingModel: pingModelMock,
}));

import { GET } from "@/app/api/ai/ping/route";

describe("GET /api/ai/ping", () => {
    afterEach(() => {
        pingModelMock.mockReset();
    });

    it("returns 200 and JSON body when pingModel succeeds", async () => {
        pingModelMock.mockResolvedValue({
            latencyMs: 12,
            model: "anthropic/claude-sonnet-4.6",
            ok: true,
            response: "pong",
        });

        const response = await GET();

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("application/json");
        await expect(response.json()).resolves.toEqual({
            latencyMs: 12,
            model: "anthropic/claude-sonnet-4.6",
            ok: true,
            response: "pong",
        });
    });

    it("returns 500 and error JSON when pingModel fails", async () => {
        pingModelMock.mockResolvedValue({
            code: "MISSING_ENV",
            error: "AI gateway is not configured.",
            ok: false,
        });

        const response = await GET();

        expect(response.status).toBe(500);
        expect(response.headers.get("content-type")).toContain("application/json");
        const payload = await response.json();
        await expect(payload).toEqual({
            code: "MISSING_ENV",
            error: "AI gateway is not configured.",
            ok: false,
        });
        expect(Object.keys(payload as Record<string, unknown>).sort()).toEqual(["code", "error", "ok"]);
        expect(JSON.stringify(payload)).not.toContain("model");
    });

    it("returns 500 with EMPTY_RESPONSE when pingModel reports empty gateway output", async () => {
        pingModelMock.mockResolvedValue({
            code: "EMPTY_RESPONSE",
            error: "AI gateway returned an empty response.",
            ok: false,
        });

        const response = await GET();

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            code: "EMPTY_RESPONSE",
            error: "AI gateway returned an empty response.",
            ok: false,
        });
    });

    it("always returns a Response without throwing", async () => {
        pingModelMock.mockResolvedValue({ ok: true, latencyMs: 1, model: "m", response: "pong" });

        await expect(GET()).resolves.toBeInstanceOf(Response);
    });
});
