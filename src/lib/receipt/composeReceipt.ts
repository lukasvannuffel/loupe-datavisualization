import { displayNameForKind } from "@/components/charts/chartDisplayNames";
import type { ChartSpec } from "@/lib/chartSpec/types";

import { hashSpecAndComputations } from "./hashSpec";

export const ALL_CHART_TYPES: readonly ChartSpec["kind"][] = ["barError", "box", "km", "xy"];

const RECEIPT_VERSION = "1.0";
const LINE_WIDTH = 80;
const SEPARATOR = "-".repeat(LINE_WIDTH);

export const PRIVACY_STATEMENT =
    "Raw patient-level data was not transmitted to any external service. " +
    "Column names and aggregated statistics only were used for chart " +
    "configuration. Individual observations are not recoverable from " +
    "this receipt.";

/**
 * Aggregated computation outputs for the receipt.
 * Must NOT contain raw patient rows or individual-level values; summary statistics and counts are permitted.
 */
export interface ComputationSummary {
    readonly chartType: ChartSpec["kind"];
    readonly kmCensoredN?: number;
    readonly kmTotalN?: number;
    readonly kmGroupCount?: number;
    readonly kmStepCount?: number;
    readonly barGroupCount?: number;
    readonly barErrorType?: string;
    readonly xyPointCount?: number;
    readonly xyRSquared?: number;
    readonly boxGroupCount?: number;
    readonly boxOutlierCount?: number;
    readonly dataColumns: readonly string[];
    readonly computedAt: string;
}

export interface ReceiptInput {
    readonly spec: ChartSpec;
    readonly aiReasoning: string;
    readonly computations: ComputationSummary;
    readonly generatedAt?: string;
}

export interface Receipt {
    readonly plainText: string;
    readonly markdown: string;
    readonly hash: string;
    readonly generatedAt: string;
}

const COMPARISON_PATTERN =
    /\b(over|instead of|rather than|compared to|versus|vs\.?)\b/i;

const isUnwrappableToken = (token: string): boolean =>
    /^https?:\/\//i.test(token) || /^[a-f0-9]{64}$/i.test(token);

export const wordWrap = (text: string, width: number): string =>
    text
        .split("\n")
        .map((paragraph) => {
            if (paragraph.length === 0) {
                return "";
            }

            const words = paragraph.split(/\s+/);
            const lines: string[] = [];
            let current = "";

            for (const word of words) {
                if (isUnwrappableToken(word)) {
                    if (current.length > 0) {
                        lines.push(current);
                        current = "";
                    }
                    lines.push(word);
                    continue;
                }

                const candidate = current.length === 0 ? word : `${current} ${word}`;
                if (candidate.length <= width) {
                    current = candidate;
                    continue;
                }

                if (current.length > 0) {
                    lines.push(current);
                }

                if (word.length > width) {
                    lines.push(word);
                    current = "";
                    continue;
                }

                current = word;
            }

            if (current.length > 0) {
                lines.push(current);
            }

            return lines.join("\n");
        })
        .join("\n");

const centerLine = (line: string, width: number): string => {
    if (line.length >= width) {
        return line;
    }

    const padding = Math.floor((width - line.length) / 2);

    return `${" ".repeat(padding)}${line}`;
};

// Shallow guard only — checks top-level values of ComputationSummary.
// ComputationSummary MUST NOT be extended with nested objects containing
// numeric arrays. This interface is the privacy boundary; see type definition.
// Recursive guard deferred to V2.
export const assertNoRawData = (summary: ComputationSummary): void => {
    const forbidden = Object.values(summary).filter(
        (value) =>
            Array.isArray(value) &&
            value.length > 0 &&
            (value as unknown[]).every((entry) => typeof entry === "number"),
    );

    if (forbidden.length > 0) {
        throw new Error("Receipt: ComputationSummary contains numeric arrays — possible raw data leak.");
    }
};

const recommendationSentence = (spec: ChartSpec, aiReasoning: string): string => {
    const kindLabel = displayNameForKind(spec.kind);
    const sentences = aiReasoning
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0);

    const match = sentences.find(
        (sentence) =>
            sentence.toLowerCase().includes(kindLabel.toLowerCase()) || COMPARISON_PATTERN.test(sentence),
    );

    return match ?? "See intent section for full reasoning.";
};

const alternativeLabels = (selected: ChartSpec["kind"]): readonly string[] =>
    ALL_CHART_TYPES.filter((kind) => kind !== selected).map((kind) => displayNameForKind(kind));

const computationLines = (summary: ComputationSummary): readonly string[] => {
    const lines: string[] = [];

    switch (summary.chartType) {
        case "km":
            lines.push("Chart type: Kaplan-Meier survival curve");
            if (summary.kmTotalN !== undefined) {
                lines.push(`Total observations (N): ${summary.kmTotalN}`);
            }
            if (summary.kmCensoredN !== undefined) {
                lines.push(`Censored observations: ${summary.kmCensoredN}`);
            }
            if (summary.kmGroupCount !== undefined) {
                lines.push(`Number of groups: ${summary.kmGroupCount}`);
            }
            if (summary.kmStepCount !== undefined) {
                lines.push(`KM steps computed: ${summary.kmStepCount}`);
            }
            lines.push(
                "Note: No p-values or log-rank statistics were computed. Survival estimates use the Kaplan-Meier product-limit estimator with Greenwood confidence intervals.",
            );
            break;
        case "barError":
            lines.push("Chart type: Bar chart with error bars");
            if (summary.barGroupCount !== undefined) {
                lines.push(`Groups: ${summary.barGroupCount}`);
            }
            if (summary.barErrorType !== undefined) {
                lines.push(`Error metric: ${summary.barErrorType}`);
            }
            break;
        case "xy":
            lines.push("Chart type: XY scatter / line");
            if (summary.xyPointCount !== undefined) {
                lines.push(`Data points: ${summary.xyPointCount}`);
            }
            if (summary.xyRSquared !== undefined) {
                lines.push(`R² (regression): ${summary.xyRSquared}`);
            }
            break;
        case "box":
            lines.push("Chart type: Box plot (IQR + whiskers)");
            if (summary.boxGroupCount !== undefined) {
                lines.push(`Groups: ${summary.boxGroupCount}`);
            }
            if (summary.boxOutlierCount !== undefined) {
                lines.push(`Outliers shown: ${summary.boxOutlierCount}`);
            }
            break;
    }

    lines.push(`Input columns used: ${summary.dataColumns.join(", ")}`);
    lines.push(`Computations performed: ${summary.computedAt}`);

    return lines;
};

type SectionBlock = {
    readonly plainTitle: string;
    readonly markdownTitle: string;
    readonly bodyLines: readonly string[];
};

const buildSections = (
    input: ReceiptInput,
    hash: string,
    generatedAt: string,
): readonly SectionBlock[] => {
    const intentBody = input.aiReasoning.trim().length > 0 ? [input.aiReasoning.trim()] : ["(No intent provided.)"];
    const recommended = displayNameForKind(input.spec.kind);

    return [
        {
            plainTitle: "INTENT",
            markdownTitle: "Intent",
            bodyLines: intentBody,
        },
        {
            plainTitle: "CHART RECOMMENDATION",
            markdownTitle: "Chart recommendation",
            bodyLines: [
                `Loupe recommended: ${recommended}`,
                recommendationSentence(input.spec, input.aiReasoning),
            ],
        },
        {
            plainTitle: "ALTERNATIVES CONSIDERED",
            markdownTitle: "Alternatives considered",
            bodyLines: [
                "The following chart types were considered and not selected:",
                ...alternativeLabels(input.spec.kind).map((label) => `- ${label}`),
            ],
        },
        {
            plainTitle: "COMPUTATIONS PERFORMED",
            markdownTitle: "Computations performed",
            bodyLines: [...computationLines(input.computations)],
        },
        {
            plainTitle: "PRIVACY STATEMENT",
            markdownTitle: "Privacy statement",
            bodyLines: [PRIVACY_STATEMENT],
        },
        {
            plainTitle: "CONFIGURATION HASH",
            markdownTitle: "Configuration hash",
            bodyLines: [
                `SHA-256 (ChartSpec + computations):`,
                hash,
                `Generated: ${generatedAt}`,
                "This hash can be used to verify that the chart configuration and " +
                    "computation outputs have not been modified since this receipt was generated.",
            ],
        },
    ];
};

const formatPlainText = (sections: readonly SectionBlock[]): string => {
    const header = [
        centerLine("LOUPE REPRODUCIBILITY RECEIPT", LINE_WIDTH),
        centerLine(`Version ${RECEIPT_VERSION}`, LINE_WIDTH),
        "",
    ];

    const blocks = sections.flatMap((section, index) => {
        const preamble =
            section.plainTitle === "INTENT"
                ? ["The researcher described the following analytical intent:"]
                : [];

        const indentedBody = section.bodyLines.flatMap((line) => {
            if (section.plainTitle === "INTENT") {
                return wordWrap(line, LINE_WIDTH - 2)
                    .split("\n")
                    .map((wrapped) => `  ${wrapped}`);
            }

            return wordWrap(line, LINE_WIDTH).split("\n");
        });

        const block = [
            section.plainTitle,
            ...preamble.flatMap((line) => wordWrap(line, LINE_WIDTH).split("\n")),
            ...indentedBody,
        ];
        if (index < sections.length - 1) {
            block.push(SEPARATOR);
        }

        return block;
    });

    const footer = ["", "End of receipt."];

    return [...header, ...blocks, ...footer].join("\n");
};

const formatMarkdown = (sections: readonly SectionBlock[]): string => {
    const lines = ["# Loupe Reproducibility Receipt", "", `Version ${RECEIPT_VERSION}`, ""];

    for (const section of sections) {
        lines.push(`## ${section.markdownTitle}`, "");

        if (section.markdownTitle === "Intent") {
            lines.push("The researcher described the following analytical intent:", "");
            lines.push(`> ${section.bodyLines.join("\n> ")}`, "");
            continue;
        }

        if (section.markdownTitle === "Chart recommendation") {
            lines.push(section.bodyLines[0] ?? "", "", section.bodyLines[1] ?? "", "");
            continue;
        }

        if (section.markdownTitle === "Alternatives considered") {
            lines.push(section.bodyLines[0] ?? "", "");
            for (const line of section.bodyLines.slice(1)) {
                lines.push(line);
            }
            lines.push("");
            continue;
        }

        if (section.markdownTitle === "Configuration hash") {
            lines.push(section.bodyLines[0] ?? "");
            lines.push("");
            lines.push("```");
            lines.push(section.bodyLines[1] ?? "");
            lines.push("```");
            lines.push("");
            lines.push(section.bodyLines[2] ?? "");
            lines.push("");
            lines.push(section.bodyLines[3] ?? "");
            lines.push("");
            continue;
        }

        for (const line of section.bodyLines) {
            lines.push(line);
        }
        lines.push("");
    }

    lines.push("---", "", "*End of receipt.*");

    return lines.join("\n");
};

export async function composeReceipt(input: ReceiptInput): Promise<Receipt> {
    assertNoRawData(input.computations);

    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const hash = await hashSpecAndComputations(input.spec, input.computations);
    const sections = buildSections(input, hash, generatedAt);

    return {
        plainText: formatPlainText(sections),
        markdown: formatMarkdown(sections),
        hash,
        generatedAt,
    };
}
