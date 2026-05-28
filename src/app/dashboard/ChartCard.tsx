"use client";

import Link from "next/link";

import type { ChartListItem } from "@/lib/charts/listCharts";
import { chartKindIcon } from "@/lib/thumbnail/chartKindIcons";

import { ChartKindBadge } from "./ChartKindBadge";
import { DeleteChartButton } from "./DeleteChartButton";
import styles from "./dashboard.module.css";

type ChartCardProps = {
    readonly chart: ChartListItem;
};

const formatRelativeDate = (iso: string): string => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const minuteMs = 60_000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (Math.abs(diffMs) < hourMs) {
        return rtf.format(Math.round(diffMs / minuteMs), "minute");
    }
    if (Math.abs(diffMs) < dayMs) {
        return rtf.format(Math.round(diffMs / hourMs), "hour");
    }

    return rtf.format(Math.round(diffMs / dayMs), "day");
};

export const ChartCard = ({ chart }: ChartCardProps): JSX.Element => {
    const thumbnail = chart.thumbnail ?? chartKindIcon(chart.chart_kind);

    return (
        <article className={styles.card}>
            <Link href={`/export?id=${chart.id}`} className={styles.cardLink}>
                <div className={styles.thumb}>
                    <img
                        src={thumbnail}
                        alt=""
                        className={styles.thumbImage}
                        width={240}
                        height={160}
                    />
                </div>
                <h3 className={styles.cardTitle}>{chart.name}</h3>
                <div className={styles.metaRow}>
                    <ChartKindBadge kind={chart.chart_kind} />
                    <time dateTime={chart.updated_at} className={styles.date}>
                        {formatRelativeDate(chart.updated_at)}
                    </time>
                </div>
            </Link>
            <DeleteChartButton chartId={chart.id} chartName={chart.name} />
        </article>
    );
};
