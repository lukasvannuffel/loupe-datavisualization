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

const FALLBACK_PRICING_MODEL = "anthropic/claude-sonnet-4.6";

export const estimateCostEur = (
    usage: { inputTokens?: number; outputTokens?: number } | undefined,
    model: string,
): number => {
    let rates = PRICING_PER_MILLION_USD[model];

    if (rates === undefined) {
        console.warn("[ai] unknown model for cost estimate — using fallback Sonnet 4 rates", model);
        rates = PRICING_PER_MILLION_USD[FALLBACK_PRICING_MODEL]!;
    }

    const inputUsd = ((usage?.inputTokens ?? 0) / 1_000_000) * rates.input;
    const outputUsd = ((usage?.outputTokens ?? 0) / 1_000_000) * rates.output;

    return (inputUsd + outputUsd) * USD_TO_EUR;
};
