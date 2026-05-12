export const PING_PROMPT = "Reply with the single word: pong" as const;

/** Values passed to `createGateway` from `ai` (Vercel AI Gateway). */
export type ResolvedEnv = {
    readonly apiKey: string;
    readonly model: string;
    readonly baseUrl?: string;
};

export type AiPingResult = {
    readonly ok: true;
    readonly response: string;
    readonly model: string;
    readonly latencyMs: number;
};

export type AiPingError = {
    readonly ok: false;
    readonly error: string;
    readonly code: "EMPTY_RESPONSE" | "MISSING_ENV" | "TIMEOUT" | "UPSTREAM_FAILURE";
};
