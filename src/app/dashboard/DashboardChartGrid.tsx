"use client";

import { useState } from "react";

import type { ChartListItem } from "@/lib/charts/listCharts";

import { ChartCard } from "./ChartCard";
import styles from "./dashboard.module.css";

type DashboardChartGridProps = {
    readonly charts: readonly ChartListItem[];
};

export const DashboardChartGrid = ({ charts }: DashboardChartGridProps): JSX.Element => {
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const allTags = [...new Set(charts.flatMap((chart) => chart.tags ?? []))].sort();

    const filteredCharts =
        activeTag === null
            ? charts
            : charts.filter((chart) => (chart.tags ?? []).includes(activeTag));

    return (
        <>
            {allTags.length > 0 ? (
                <div className={styles.tagFilter} role="group" aria-label="Filter by tag">
                    <button
                        type="button"
                        className={
                            activeTag === null
                                ? "btn btn--sm btn--primary"
                                : "btn btn--sm btn--secondary"
                        }
                        onClick={() => setActiveTag(null)}
                    >
                        All
                    </button>
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            className={
                                activeTag === tag
                                    ? "btn btn--sm btn--primary"
                                    : "btn btn--sm btn--secondary"
                            }
                            onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            ) : null}
            <section className={styles.grid}>
                {filteredCharts.map((chart) => (
                    <ChartCard key={chart.id} chart={chart} />
                ))}
            </section>
        </>
    );
};
