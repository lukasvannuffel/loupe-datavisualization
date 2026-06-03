"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ChartListItem } from "@/lib/charts/listCharts";
import { chartKindIcon } from "@/lib/thumbnail/chartKindIcons";
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from "@/lib/thumbnail/generateThumbnail";

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
    const [kebabOpen, setKebabOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const summaryRef = useRef<HTMLElement>(null);
    const thumbnail = chart.thumbnail ?? chartKindIcon(chart.chart_kind);

    useEffect(() => {
        if (!kebabOpen || deleteDialogOpen) {
            return;
        }

        const onPointerDown = (event: PointerEvent): void => {
            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }
            if (detailsRef.current !== null && !detailsRef.current.contains(target)) {
                setKebabOpen(false);
            }
        };

        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setKebabOpen(false);
                summaryRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [deleteDialogOpen, kebabOpen]);

    const openDeleteDialog = (): void => {
        setKebabOpen(false);
        setDeleteDialogOpen(true);
    };

    return (
        <article className={styles.card}>
            <details
                ref={detailsRef}
                className={styles.kebabWrap}
                open={kebabOpen}
                onToggle={(event) => setKebabOpen(event.currentTarget.open)}
            >
                <summary
                    ref={summaryRef}
                    className={styles.kebabTrigger}
                    aria-label="More actions"
                    aria-expanded={kebabOpen}
                >
                    ⋯
                </summary>
                {/* role="menu" with single item today. If more actions are added,
                    implement full menu keyboard pattern (arrow keys, roving tabindex). */}
                <div className={styles.kebabMenu} role="menu">
                    <button
                        type="button"
                        role="menuitem"
                        className={styles.kebabMenuItem}
                        onClick={(event) => {
                            event.stopPropagation();
                            openDeleteDialog();
                        }}
                    >
                        Delete
                    </button>
                </div>
            </details>
            <DeleteChartButton
                chartId={chart.id}
                chartName={chart.name}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
            />
            <Link href={`/export?id=${chart.id}`} className={styles.cardLink}>
                <div className={styles.thumb}>
                    <img
                        src={thumbnail}
                        alt=""
                        className={styles.thumbImage}
                        width={THUMBNAIL_WIDTH}
                        height={THUMBNAIL_HEIGHT}
                    />
                </div>
                <h3 className={`serif ${styles.cardTitle}`}>{chart.name}</h3>
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
