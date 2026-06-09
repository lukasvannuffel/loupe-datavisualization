import type { DashboardChartKind } from "@/lib/thumbnail/chartKindIcons";

import styles from "./dashboard.module.css";

export type ChartKindMeta = {
    readonly label: string;
    readonly chipClass: string;
};

export const TYPE_META: Record<DashboardChartKind, ChartKindMeta> = {
    km: { label: "Kaplan–Meier", chipClass: styles.typeChip },
    bar: { label: "Bar with error bars", chipClass: `${styles.typeChip} ${styles.tForest}` },
    box: { label: "Box plot", chipClass: `${styles.typeChip} ${styles.tBox}` },
    xy: { label: "Line / scatter", chipClass: `${styles.typeChip} ${styles.tRoc}` },
};

export const TYPE_ORDER: readonly DashboardChartKind[] = ["km", "bar", "box", "xy"];
