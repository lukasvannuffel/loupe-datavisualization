"use client";

import { useMemo, useState } from "react";

import { updateChartMetadata } from "@/app/charts/actions";
import type { ChartListItem } from "@/lib/charts/listCharts";
import type { DashboardChartKind } from "@/lib/thumbnail/chartKindIcons";
import { useToast } from "@/lib/toast/useToast";

import { ChartCard } from "./ChartCard";
import { ChartListRow } from "./ChartListRow";
import { TYPE_META, TYPE_ORDER } from "./chartKindMeta";
import { DashboardEmpty } from "./DashboardEmpty";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardTagFilter } from "./DashboardTagFilter";
import { DashboardToolbar } from "./DashboardToolbar";
import type { DashboardSort, DashboardView } from "./dashboardUtils";
import styles from "./dashboard.module.css";

type DashboardShellProps = {
    readonly initialCharts: readonly ChartListItem[];
    readonly displayName: string;
};

export const DashboardShell = ({
    initialCharts,
    displayName,
}: DashboardShellProps): JSX.Element => {
    const { toast } = useToast();
    const [charts, setCharts] = useState<readonly ChartListItem[]>(() => [...initialCharts]);
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [sort, setSort] = useState<DashboardSort>("recent");
    const [view, setView] = useState<DashboardView>("grid");
    const [grouped, setGrouped] = useState(false);

    const tagCounts = useMemo(() => {
        const counts = new Map<string, number>();
        charts.forEach((chart) => {
            chart.tags.forEach((tag) => {
                counts.set(tag, (counts.get(tag) ?? 0) + 1);
            });
        });

        return [...counts.entries()]
            .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
            .map(([tag, count]) => ({ tag, count }));
    }, [charts]);

    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        let result = charts.filter((chart) => {
            if (activeTag !== null && !chart.tags.includes(activeTag)) {
                return false;
            }

            if (normalizedQuery === "") {
                return true;
            }

            return (
                chart.name.toLowerCase().includes(normalizedQuery) ||
                chart.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
                TYPE_META[chart.chart_kind].label.toLowerCase().includes(normalizedQuery)
            );
        });

        result = [...result].sort((a, b) => {
            if (sort === "name") {
                return a.name.localeCompare(b.name);
            }

            if (sort === "type") {
                const typeDiff =
                    TYPE_ORDER.indexOf(a.chart_kind) - TYPE_ORDER.indexOf(b.chart_kind);
                if (typeDiff !== 0) {
                    return typeDiff;
                }
            }

            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        return result;
    }, [activeTag, charts, query, sort]);

    const groups = useMemo(() => {
        if (!grouped) {
            return null;
        }

        const byKind = new Map<DashboardChartKind, ChartListItem[]>();
        filtered.forEach((chart) => {
            const bucket = byKind.get(chart.chart_kind) ?? [];
            bucket.push(chart);
            byKind.set(chart.chart_kind, bucket);
        });

        return TYPE_ORDER.filter((kind) => byKind.has(kind)).map((kind) => ({
            kind,
            items: byKind.get(kind) ?? [],
        }));
    }, [filtered, grouped]);

    const hasFilters = query.trim().length > 0 || activeTag !== null;

    const clearFilters = (): void => {
        setQuery("");
        setActiveTag(null);
    };

    const onDeleteChart = (id: string): void => {
        setCharts((current) => current.filter((chart) => chart.id !== id));
    };

    const onUpdateChart = async (
        id: string,
        patch: { readonly name?: string; readonly tags?: readonly string[] },
    ): Promise<boolean> => {
        const previous = charts;
        setCharts((current) =>
            current.map((chart) =>
                chart.id === id
                    ? {
                          ...chart,
                          ...(patch.name !== undefined ? { name: patch.name } : {}),
                          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
                      }
                    : chart,
            ),
        );

        const result = await updateChartMetadata({ id, ...patch });
        if (!result.success) {
            setCharts(previous);
            toast({
                title: "Could not save changes.",
                description: "Check your connection and try again.",
                variant: "error",
            });

            return false;
        }

        setCharts((current) =>
            current.map((chart) =>
                chart.id === id ? { ...chart, updated_at: result.updated_at } : chart,
            ),
        );

        return true;
    };

    const renderCollection = (items: readonly ChartListItem[]): JSX.Element =>
        view === "grid" ? (
            <div className={styles.dashGrid}>
                {items.map((chart) => (
                    <ChartCard
                        key={chart.id}
                        chart={chart}
                        onUpdateChart={onUpdateChart}
                        onDeleteChart={onDeleteChart}
                    />
                ))}
            </div>
        ) : (
            <div className={styles.dashList}>
                {items.map((chart) => (
                    <ChartListRow
                        key={chart.id}
                        chart={chart}
                        onUpdateChart={onUpdateChart}
                        onDeleteChart={onDeleteChart}
                    />
                ))}
            </div>
        );

    return (
        <div className={`${styles.page} page-enter`}>
            <DashboardHeader displayName={displayName} chartCount={charts.length} />
            <DashboardToolbar
                query={query}
                sort={sort}
                view={view}
                grouped={grouped}
                onQueryChange={setQuery}
                onSortChange={setSort}
                onViewChange={setView}
                onGroupedChange={setGrouped}
            />
            <DashboardTagFilter
                totalCount={charts.length}
                tags={tagCounts}
                activeTag={activeTag}
                onTagChange={setActiveTag}
            />

            <div className={styles.dashMeta}>
                <span className={styles.dashMetaRes}>
                    {filtered.length} of {charts.length}{" "}
                    {filtered.length === 1 ? "figure" : "figures"}
                    {activeTag !== null ? (
                        <>
                            {" "}
                            · tag <span style={{ color: "var(--ink-2)" }}>{activeTag}</span>
                        </>
                    ) : null}
                    {query.trim().length > 0 ? <> · “{query.trim()}”</> : null}
                </span>
                {hasFilters ? (
                    <button type="button" className={styles.clearAll} onClick={clearFilters}>
                        Clear filters
                    </button>
                ) : null}
            </div>

            {filtered.length === 0 ? (
                <DashboardEmpty
                    variant={charts.length === 0 ? "zero" : "filtered"}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                />
            ) : grouped && groups !== null ? (
                groups.map((group) => (
                    <section key={group.kind}>
                        <div className={styles.dashGroupHead}>
                            <h3 className="serif">{TYPE_META[group.kind].label}</h3>
                            <span className={styles.groupCount}>{group.items.length}</span>
                            <span className={styles.groupRule} />
                        </div>
                        {renderCollection(group.items)}
                    </section>
                ))
            ) : (
                renderCollection(filtered)
            )}
        </div>
    );
};
