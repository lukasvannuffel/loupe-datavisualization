export const isEffectivelyEmpty = (cell: unknown): boolean => {
    return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
};

export const isNumeric = (cell: unknown): boolean => {
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

    return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(trimmed);
};

export const isHeaderLikeText = (cell: unknown): boolean => {
    if (typeof cell !== "string") {
        return false;
    }

    const trimmed = cell.trim();
    if (trimmed === "") {
        return false;
    }

    return /[A-Za-z]/u.test(trimmed) && !/\d/u.test(trimmed);
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
