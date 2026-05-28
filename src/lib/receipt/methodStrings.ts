import type { ChartSpec } from "@/lib/chartSpec/types";

const METHOD_BY_KIND: Record<ChartSpec["kind"], string> = {
    barError: "Mean ± CI95 (t-distribution, df=n−1)",
    box: "Tukey box plot (type-7 quantiles)",
    km: "Kaplan-Meier estimator, Greenwood log-log CI",
    xy: "OLS regression",
};

export const methodString = (kind: ChartSpec["kind"]): string => METHOD_BY_KIND[kind];
