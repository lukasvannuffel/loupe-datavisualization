import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", async () => {
    const actual = await vi.importActual<typeof import("ai")>("ai");

    return {
        ...actual,
        generateText: vi.fn(),
    };
});

import { getEnv, pingModel } from "@/lib/ai/client";

const mockedGenerateText = vi.mocked(generateText);

describe("getEnv", () => {
    beforeEach(() => {
        vi.stubEnv("AI_GATEWAY_API_KEY", "test_gateway_key");
        vi.stubEnv("ANTHROPIC_MODEL", "anthropic/claude-sonnet-4.6");
        vi.stubEnv("AI_GATEWAY_BASE_URL", undefined);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("returns ResolvedEnv when all vars are set including optional base URL", () => {
        vi.stubEnv("AI_GATEWAY_API_KEY", "secret");
        vi.stubEnv("ANTHROPIC_MODEL", "custom-model");
        vi.stubEnv("AI_GATEWAY_BASE_URL", "https://example.com/v1");
        const result = getEnv();

        expect(result).toEqual({
            apiKey: "secret",
            baseUrl: "https://example.com/v1",
            model: "anthropic/custom-model",
        });
    });

    it("returns missing when AI_GATEWAY_API_KEY is absent", () => {
        vi.stubEnv("AI_GATEWAY_API_KEY", undefined);
        const result = getEnv();

        expect(result).toEqual({ missing: ["AI_GATEWAY_API_KEY"] });
    });

    it("returns both missing names when API key and explicit empty base URL are invalid", () => {
        vi.stubEnv("AI_GATEWAY_API_KEY", "");
        vi.stubEnv("AI_GATEWAY_BASE_URL", "");
        const result = getEnv();

        expect(result).toEqual({ missing: ["AI_GATEWAY_API_KEY", "AI_GATEWAY_BASE_URL"] });
    });

    it("treats empty AI_GATEWAY_API_KEY as missing", () => {
        vi.stubEnv("AI_GATEWAY_API_KEY", "   ");
        const result = getEnv();

        expect(result).toEqual({ missing: ["AI_GATEWAY_API_KEY"] });
    });

    it("applies default gateway model when ANTHROPIC_MODEL and AI_GATEWAY_BASE_URL are unset", () => {
        vi.stubEnv("ANTHROPIC_MODEL", undefined);
        vi.stubEnv("AI_GATEWAY_BASE_URL", undefined);
        const result = getEnv();

        expect(result).toEqual({
            apiKey: "test_gateway_key",
            model: "anthropic/claude-sonnet-4.6",
        });
    });
});

describe("pingModel", () => {
    beforeEach(() => {
        vi.stubEnv("AI_GATEWAY_API_KEY", "test_gateway_key");
        vi.stubEnv("ANTHROPIC_MODEL", "anthropic/claude-sonnet-4.6");
        vi.stubEnv("AI_GATEWAY_BASE_URL", undefined);
        mockedGenerateText.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("returns success when generateText returns text", async () => {
        mockedGenerateText.mockResolvedValue({ text: "pong" } as Awaited<ReturnType<typeof generateText>>);

        const result = await pingModel();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.response).toBe("pong");
            expect(result.model).toBe("anthropic/claude-sonnet-4.6");
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        }
    });

    it("does not call generateText when AI_GATEWAY_API_KEY is missing", async () => {
        vi.stubEnv("AI_GATEWAY_API_KEY", undefined);

        const result = await pingModel();

        expect(result).toEqual({
            ok: false,
            code: "MISSING_ENV",
            error: "AI gateway is not configured.",
        });
        expect(mockedGenerateText).not.toHaveBeenCalled();
    });

    it("maps generic errors to UPSTREAM_FAILURE and logs only safe metadata", async () => {
        const err = new Error("secret upstream detail");
        mockedGenerateText.mockRejectedValue(err);
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});

        const result = await pingModel();

        expect(result).toEqual({
            ok: false,
            code: "UPSTREAM_FAILURE",
            error: "AI gateway upstream error.",
        });
        expect(spy).toHaveBeenCalledWith("[ai] upstream failure", { errName: "Error" });
        spy.mockRestore();
    });

    it("never echoes upstream Error.message in the JSON body (sensitive substrings)", async () => {
        const tokenLike = ["gw", "00bad"].join("_");
        mockedGenerateText.mockRejectedValue(
            new Error(`Auth rejected: key ${tokenLike} and more detail here`),
        );
        const result = await pingModel();
        const serialized = JSON.stringify(result);

        expect(serialized).not.toContain(tokenLike);
        expect(serialized).not.toContain("rejected");
        expect(serialized).not.toContain("detail");
    });

    it("maps non-string model output to UPSTREAM_FAILURE without throwing", async () => {
        mockedGenerateText.mockResolvedValue({} as Awaited<ReturnType<typeof generateText>>);

        const result = await pingModel();

        expect(result).toEqual({
            ok: false,
            code: "UPSTREAM_FAILURE",
            error: "AI gateway upstream error.",
        });
    });

    it("maps AbortError to TIMEOUT", async () => {
        const err = new DOMException("aborted", "AbortError");
        mockedGenerateText.mockRejectedValue(err);

        const result = await pingModel();

        expect(result).toEqual({
            ok: false,
            code: "TIMEOUT",
            error: "AI gateway timed out.",
        });
    });

    it("trims whitespace from response text", async () => {
        mockedGenerateText.mockResolvedValue({ text: "  pong  " } as Awaited<ReturnType<typeof generateText>>);

        const result = await pingModel();

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.response).toBe("pong");
        }
    });

    it("returns EMPTY_RESPONSE for whitespace-only model output (mutation: fails if trim-empty check removed)", async () => {
        mockedGenerateText.mockResolvedValue({ text: "   " } as Awaited<ReturnType<typeof generateText>>);

        const result = await pingModel();

        expect(result).toEqual({
            ok: false,
            code: "EMPTY_RESPONSE",
            error: "AI gateway returned an empty response.",
        });
    });

    it("returns EMPTY_RESPONSE for empty string model output (mutation: fails if trim-empty check removed)", async () => {
        mockedGenerateText.mockResolvedValue({ text: "" } as Awaited<ReturnType<typeof generateText>>);

        const result = await pingModel();

        expect(result).toEqual({
            ok: false,
            code: "EMPTY_RESPONSE",
            error: "AI gateway returned an empty response.",
        });
    });
});
