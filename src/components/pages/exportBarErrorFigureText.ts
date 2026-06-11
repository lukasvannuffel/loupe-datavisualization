import type { ErrorBarType } from "@/lib/chartSpec/aggregators/barError.types";

export const buildBarErrorMetaLine = (
    groups: ReadonlyArray<{ readonly n: number }>,
): string => {
    const totalN = groups.reduce((sum, group) => sum + group.n, 0);

    return groups.length > 1 ? `n = ${totalN} · groups = ${groups.length}` : `n = ${totalN}`;
};

export const buildBarErrorCaption = (errorBarType: ErrorBarType): string => {
    if (errorBarType === "ci95") {
        return "Bar heights are group means with 95% confidence intervals (t-distribution, df = n − 1).";
    }

    if (errorBarType === "sem") {
        return "Bar heights are group means with standard error of the mean.";
    }

    return "Bar heights are group means with standard deviation error bars.";
};
