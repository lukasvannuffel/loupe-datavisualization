const NUMBER_WITH_GROUPS_DOT = /^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:[eE][-+]?\d+)?$/u;
const NUMBER_WITH_GROUPS_COMMA = /^[-+]?\d{1,3}(?:\.\d{3})+(?:,\d+)?(?:[eE][-+]?\d+)?$/u;
const NUMBER_WITH_DECIMAL_DOT = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/u;
const NUMBER_WITH_DECIMAL_COMMA = /^[-+]?(?:\d+,?\d*|,\d+)(?:[eE][-+]?\d+)?$/u;

export type NumericProfile = "dot" | "comma";

export const isEffectivelyEmpty = (cell: unknown): boolean => {
    return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
};

const normalizedNumericString = (raw: string, profile: NumericProfile): string | null => {
    if (profile === "dot") {
        if (NUMBER_WITH_GROUPS_DOT.test(raw)) {
            return raw.replace(/,/gu, "");
        }

        return NUMBER_WITH_DECIMAL_DOT.test(raw) ? raw : null;
    }

    if (NUMBER_WITH_GROUPS_COMMA.test(raw)) {
        return raw.replace(/\./gu, "").replace(",", ".");
    }

    return NUMBER_WITH_DECIMAL_COMMA.test(raw) ? raw.replace(",", ".") : null;
};

export const isNumeric = (cell: unknown, profile: NumericProfile): boolean => {
    if (typeof cell === "number") {
        return Number.isFinite(cell);
    }

    if (typeof cell !== "string") {
        return false;
    }

    const trimmed = cell.trim();
    if (trimmed === "") {
        return false;
    }

    const normalized = normalizedNumericString(trimmed, profile);
    return normalized !== null && Number.isFinite(Number(normalized));
};

export const inferNumericProfile = (aoa: readonly (readonly unknown[])[]): NumericProfile => {
    const MAX_PROFILE_ROWS = 200;
    let dotScore = 0;
    let commaScore = 0;

    for (let rowIndex = 0; rowIndex < aoa.length && rowIndex < MAX_PROFILE_ROWS; rowIndex++) {
        const row = aoa[rowIndex] ?? [];
        for (const cell of row) {
            if (typeof cell !== "string") {
                continue;
            }

            const trimmed = cell.trim();
            if (trimmed === "") {
                continue;
            }

            if (NUMBER_WITH_GROUPS_DOT.test(trimmed)) {
                dotScore += 2;
                continue;
            }
            if (NUMBER_WITH_GROUPS_COMMA.test(trimmed)) {
                commaScore += 2;
                continue;
            }
            if (NUMBER_WITH_DECIMAL_DOT.test(trimmed) && trimmed.includes(".")) {
                dotScore += 1;
            }
            if (NUMBER_WITH_DECIMAL_COMMA.test(trimmed) && trimmed.includes(",")) {
                commaScore += 1;
            }
        }
    }

    return commaScore > dotScore ? "comma" : "dot";
};

export const isHeaderLikeText = (cell: unknown, profile: NumericProfile): boolean => {
    if (typeof cell !== "string") {
        return false;
    }

    const trimmed = cell.trim();
    if (trimmed === "") {
        return false;
    }

    const letterMatches = trimmed.match(/[A-Za-z]/gu);
    return letterMatches !== null && letterMatches.length >= 2 && !isNumeric(trimmed, profile);
};

const EMBEDDED_HEADER_PERIOD = /\d+\s*(?:months?|weeks?|years?|days?)\b/i;
const EMBEDDED_HEADER_PAREN_LABEL = /\([^)]+\)/u;
const EMBEDDED_HEADER_ID = /^(?:[A-Z]{2,}\d{3,}|\w+-\d+)$/i;

/**
 * Stricter than `isHeaderLikeText` for embedded-header detection: excludes multi-word
 * clinical labels and trial IDs so categorical data rows are not mistaken for a
 * repeated header row. Parenthetical summary labels (e.g. `Baseline (n)`) still count.
 */
export const isEmbeddedHeaderLikeText = (cell: unknown, profile: NumericProfile): boolean => {
    if (!isHeaderLikeText(cell, profile)) {
        return false;
    }

    const trimmed = String(cell).trim();
    if (EMBEDDED_HEADER_PERIOD.test(trimmed)) {
        return true;
    }
    if (EMBEDDED_HEADER_PAREN_LABEL.test(trimmed)) {
        return true;
    }
    if (/\s/u.test(trimmed)) {
        return false;
    }
    if (EMBEDDED_HEADER_ID.test(trimmed)) {
        return false;
    }

    return true;
};

export const headerCellsWithoutTrailingEmpties = (headerRow: readonly unknown[]): readonly unknown[] => {
    let lastNonEmptyIndex = -1;
    for (let index = 0; index < headerRow.length; index++) {
        if (!isEffectivelyEmpty(headerRow[index])) {
            lastNonEmptyIndex = index;
        }
    }

    return lastNonEmptyIndex < 0 ? [] : headerRow.slice(0, lastNonEmptyIndex + 1);
};

export const countNonEmptyClusters = (cells: readonly unknown[]): number => {
    let clusterCount = 0;
    let clusterSize = 0;

    for (const cell of cells) {
        if (isEffectivelyEmpty(cell)) {
            if (clusterSize >= 2) {
                clusterCount += 1;
            }
            clusterSize = 0;
            continue;
        }
        clusterSize += 1;
    }

    return clusterSize >= 2 ? clusterCount + 1 : clusterCount;
};
