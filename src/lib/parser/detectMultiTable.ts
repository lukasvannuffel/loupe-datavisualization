import type { MultiTableReason } from "./types";
import {
    countNonEmptyClusters,
    headerCellsWithoutTrailingEmpties,
    inferNumericProfile,
    isEffectivelyEmpty,
    isEmbeddedHeaderLikeText,
    isNumeric,
} from "./detectMultiTable.helpers";

export type MultiTableDetection =
    | {
          readonly detected: true;
          readonly reason: MultiTableReason;
          readonly hint: string;
      }
    | { readonly detected: false };

export function detectMultiTable(aoa: readonly (readonly unknown[])[]): MultiTableDetection {
    if (aoa.length === 0) {
        return { detected: false };
    }

    const headerRow = headerCellsWithoutTrailingEmpties(aoa[0] ?? []);
    const headerClusters = countNonEmptyClusters(headerRow);
    const numericProfile = inferNumericProfile(aoa);

    if (headerClusters >= 2) {
        return {
            detected: true,
            reason: "horizontal_split",
            hint: "There appear to be two or more tables side-by-side. Save each table in its own sheet, or delete the empty divider column.",
        };
    }

    for (let rowIndex = 1; rowIndex < aoa.length; rowIndex++) {
        const row = aoa[rowIndex] ?? [];
        const nonEmptyCells = row.filter((cell) => !isEffectivelyEmpty(cell));
        if (nonEmptyCells.length === 0) {
            continue;
        }

        const nonNumericCount = nonEmptyCells.filter((cell) => !isNumeric(cell, numericProfile)).length;
        if (nonNumericCount / nonEmptyCells.length < 0.5) {
            continue;
        }
        const headerLikeCount = nonEmptyCells.filter((cell) =>
            isEmbeddedHeaderLikeText(cell, numericProfile),
        ).length;
        if (headerLikeCount < 2 || headerLikeCount / nonEmptyCells.length < 0.5) {
            continue;
        }

        const maxLength = Math.max(row.length, headerRow.length);
        let differentCellCount = 0;
        for (let colIndex = 0; colIndex < maxLength; colIndex++) {
            if (String(row[colIndex] ?? "").trim() !== String(headerRow[colIndex] ?? "").trim()) {
                differentCellCount += 1;
            }
            if (differentCellCount >= 2) {
                return {
                    detected: true,
                    reason: "embedded_header",
                    hint: `A second header row was found at row ${rowIndex + 1}. This sheet likely contains two stacked tables. Split them into separate sheets.`,
                };
            }
        }
    }

    if (headerRow.length === 0) {
        return { detected: false };
    }

    const emptyCount = headerRow.filter((cell) => isEffectivelyEmpty(cell)).length;
    if (emptyCount / headerRow.length > 0.3 && headerClusters >= 2) {
        return {
            detected: true,
            reason: "horizontal_split",
            hint: "The header row has multiple separate groups of columns with gaps between them. This may indicate side-by-side tables.",
        };
    }

    return { detected: false };
}
