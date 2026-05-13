/** Official Claude Sonnet 4 list pricing (USD per 1M tokens) — see Anthropic pricing docs. */
export const PRICING_PER_MILLION_USD: Record<
    string,
    { readonly input: number; readonly output: number }
> = {
    "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
    "anthropic/claude-sonnet-4-20250514": { input: 3, output: 15 },
};

/** Rough EUR conversion for dashboard estimates only — not contractual billing. */
export const USD_TO_EUR = 0.93;
