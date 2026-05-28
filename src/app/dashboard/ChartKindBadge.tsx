import type { DashboardChartKind } from "@/lib/thumbnail/chartKindIcons";

import styles from "./dashboard.module.css";

type ChartKindBadgeProps = {
    readonly kind: DashboardChartKind;
};

const LABEL_BY_KIND: Record<DashboardChartKind, string> = {
    bar: "Bar",
    box: "Box",
    km: "Kaplan-Meier",
    xy: "XY",
};

export const ChartKindBadge = ({ kind }: ChartKindBadgeProps): JSX.Element => (
    <span className={styles.badge}>{LABEL_BY_KIND[kind]}</span>
);
