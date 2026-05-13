import type { RecommendPayload } from "../recommendChart.types";

export const buildUserPrompt = (payload: RecommendPayload): string => {
    const columns = payload.columns
        .map(
            (c) =>
                `- ${c.name} (${c.primaryType}${c.semanticTag !== undefined ? `, semantic: ${c.semanticTag}` : ""}, ${c.uniqueCount} distinct, ${c.nullCount} missing)`,
        )
        .join("\n");
    const mapping =
        Object.entries(payload.mapping)
            .filter(([, col]) => col)
            .map(([role, col]) => `- ${role}: ${col}`)
            .join("\n") || "(none assigned)";

    return `Intent:\n${payload.intent}\n\nColumns:\n${columns}\n\nUser-assigned roles:\n${mapping}\n\nRespond with the JSON object only.`;
};
