import { createGateway, generateText } from "ai";

import type { AiPingError, AiPingResult, ResolvedEnv } from "@/lib/ai/client.types";
import { PING_PROMPT } from "@/lib/ai/client.types";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

function normalizeGatewayModel(raw: string): string {
    const t = raw.trim();
    return t.includes("/") ? t : `anthropic/${t}`;
}
export function getEnv(): ResolvedEnv | { readonly missing: ReadonlyArray<string> } {
    const missing: string[] = [];
    const apiKey =
        typeof process.env.AI_GATEWAY_API_KEY === "string" ? process.env.AI_GATEWAY_API_KEY.trim() : "";
    if (!apiKey) {
        missing.push("AI_GATEWAY_API_KEY");
    }
    let model = DEFAULT_MODEL;
    if (process.env.ANTHROPIC_MODEL !== undefined) {
        const t = process.env.ANTHROPIC_MODEL.trim();
        if (!t) {
            missing.push("ANTHROPIC_MODEL");
        } else {
            model = normalizeGatewayModel(t);
        }
    }
    let baseUrl: string | undefined;
    if (process.env.AI_GATEWAY_BASE_URL !== undefined) {
        const t = process.env.AI_GATEWAY_BASE_URL.trim();
        if (!t) {
            missing.push("AI_GATEWAY_BASE_URL");
        } else {
            baseUrl = t;
        }
    }
    if (missing.length > 0) {
        return { missing: [...new Set(missing)].sort() };
    }
    return {
        apiKey,
        model,
        ...(baseUrl !== undefined ? { baseUrl } : {}),
    };
}
export function createGatewayLanguageModel(env: ResolvedEnv) {
    return createGateway({
        apiKey: env.apiKey,
        ...(env.baseUrl !== undefined ? { baseURL: env.baseUrl } : {}),
    }).languageModel(env.model);
}
export async function pingModel(): Promise<AiPingResult | AiPingError> {
    const envResult = getEnv();
    if ("missing" in envResult) {
        return { ok: false, code: "MISSING_ENV", error: "AI gateway is not configured." };
    }
    const env = envResult;
    const started = Date.now();
    try {
        const generated = await generateText({
            abortSignal: AbortSignal.timeout(10_000),
            maxOutputTokens: 16,
            model: createGatewayLanguageModel(env),
            prompt: PING_PROMPT,
        });
        if (typeof generated.text !== "string") {
            console.error("[ai] upstream failure", { reason: "non_string_model_output" });
            return { ok: false, code: "UPSTREAM_FAILURE", error: "AI gateway upstream error." };
        }
        const trimmed = generated.text.trim();
        if (trimmed === "") {
            return {
                ok: false,
                code: "EMPTY_RESPONSE",
                error: "AI gateway returned an empty response.",
            };
        }
        return {
            ok: true,
            latencyMs: Date.now() - started,
            model: env.model,
            response: trimmed,
        };
    } catch (err) {
        const aborted =
            (err instanceof Error && err.name === "AbortError") ||
            (typeof DOMException !== "undefined" &&
                err instanceof DOMException &&
                err.name === "AbortError");
        if (aborted) {
            return { ok: false, code: "TIMEOUT", error: "AI gateway timed out." };
        }
        console.error("[ai] upstream failure", err instanceof Error ? { errName: err.name } : { kind: typeof err });
        return { ok: false, code: "UPSTREAM_FAILURE", error: "AI gateway upstream error." };
    }
}

export { PING_PROMPT };
