"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

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

const closeKebabMenu = (event: MouseEvent<HTMLButtonElement>): void => {
    const details = event.currentTarget.closest("details");
    if (details !== null) {
        details.open = false;
    }
};

export const ChartCard = ({ chart }: ChartCardProps): JSX.Element => {
    const thumbnail = chart.thumbnail ?? chartKindIcon(chart.chart_kind);

    return (
        <article className={styles.card}>
            <details className={styles.kebabWrap}>
                <summary
                    className={styles.kebabTrigger}
                    role="button"
                    aria-label="More actions"
                >
                    ⋯
                </summary>
                <div className={styles.kebabMenu} role="menu">
                    <DeleteChartButton
                        chartId={chart.id}
                        chartName={chart.name}
                        renderTrigger={({ open }) => (
                            <button
                                type="button"
                                role="menuitem"
                                className={styles.kebabMenuItem}
                                onClick={(event) => {
                                    closeKebabMenu(event);
                                    open();
                                }}
                            >
                                Delete
                            </button>
                        )}
                    />
                </div>
            </details>
            <Link href={`/export?id=${chart.id}`} className={styles.cardLink}>
                <div className={styles.thumb}>
                    <img
                        src={thumbnail}
                        alt=""
                        className={styles.thumbImage}
                        width={480}
                        height={320}
                    />
                </div>
                <h3 className={styles.cardTitle}>{chart.name}</h3>
                <div className={styles.metaRow}>
                    <ChartKindBadge kind={chart.chart_kind} />
                    <time dateTime={chart.updated_at} className={styles.date}>
                        {formatRelativeDate(chart.updated_at)}
                    </time>
                </div>
                {(chart.tags ?? []).length > 0 ? (
                    <div className={`type-badges ${styles.cardTags}`}>
                        {chart.tags.map((tag) => (
                            <span key={tag} className="type-badge">
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}
            </Link>
        </article>
    );
};
