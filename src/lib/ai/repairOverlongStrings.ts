import type { RepairTextFunction } from "ai";
import { ZodError } from "zod";
import type { core } from "zod";

const ELLIPSIS = "…";

type JsonNode = Record<PropertyKey, unknown>;

const isOverlongString = (issue: core.$ZodIssue): issue is core.$ZodIssueTooBig =>
    issue.code === "too_big" && issue.origin === "string";

const truncate = (value: string, maximum: number): string =>
    `${value.slice(0, maximum - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;

/**
 * Repairs model output whose only schema violations are strings longer than their `max()`,
 * by truncating each offending string in place with an ellipsis.
 *
 * @param options.text - Raw JSON text returned by the model.
 * @param options.error - Parse or validation error raised by `generateObject`.
 * @returns The repaired JSON text, or null when any other violation is present so the output stays rejected.
 */
export const repairOverlongStrings: RepairTextFunction = async ({ error, text }) => {
    const issues: ReadonlyArray<core.$ZodIssue> = error.cause instanceof ZodError ? error.cause.issues : [];
    const overlong: ReadonlyArray<core.$ZodIssueTooBig> = issues.filter(isOverlongString);

    if (overlong.length === 0 || overlong.length !== issues.length) {
        return null;
    }

    const repaired: JsonNode = JSON.parse(text);

    overlong.forEach(({ maximum, path }) => {
        const parent = path
            .slice(0, -1)
            .reduce<JsonNode>((node, key) => node[key] as JsonNode, repaired);
        const key: PropertyKey = path[path.length - 1];

        parent[key] = truncate(String(parent[key]), Number(maximum));
    });

    return JSON.stringify(repaired);
};
