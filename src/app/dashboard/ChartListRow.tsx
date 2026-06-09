"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ChartListItem } from "@/lib/charts/listCharts";
import { chartKindIcon } from "@/lib/thumbnail/chartKindIcons";
import { useToast } from "@/lib/toast/useToast";

import { TYPE_META } from "./chartKindMeta";
import { DeleteChartButton } from "./DeleteChartButton";
import {
    IconDownload,
    IconEdit,
    IconOpen,
    IconPlus,
    IconShare,
} from "./dashboardIcons";
import { exportHref, formatRelativeDate, shareChartUrl } from "./dashboardUtils";
import { TagEditor } from "./TagEditor";
import styles from "./dashboard.module.css";

type ChartListRowProps = {
    readonly chart: ChartListItem;
    readonly onUpdateChart: (
        id: string,
        patch: { readonly name?: string; readonly tags?: readonly string[] },
    ) => Promise<boolean>;
    readonly onDeleteChart: (id: string) => void;
};

type RowMenu = "export" | "tags" | null;

export const ChartListRow = ({
    chart,
    onUpdateChart,
    onDeleteChart,
}: ChartListRowProps): JSX.Element => {
    const router = useRouter();
    const { toast } = useToast();
    const [menu, setMenu] = useState<RowMenu>(null);
    const [renaming, setRenaming] = useState(false);
    const [draft, setDraft] = useState(chart.name);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const thumbnail = chart.thumbnail ?? chartKindIcon(chart.chart_kind);
    const typeMeta = TYPE_META[chart.chart_kind];
    const exportUrl = exportHref(chart.id);

    const openExport = (): void => {
        router.push(exportUrl);
    };

    const commitRename = async (): Promise<void> => {
        const value = draft.trim();
        if (value === "" || value === chart.name) {
            setDraft(chart.name);
            setRenaming(false);

            return;
        }

        const ok = await onUpdateChart(chart.id, { name: value });
        if (!ok) {
            setDraft(chart.name);
        }

        setRenaming(false);
    };

    const addTag = async (tag: string): Promise<void> => {
        if (chart.tags.includes(tag)) {
            return;
        }

        await onUpdateChart(chart.id, { tags: [...chart.tags, tag] });
    };

    const removeTag = async (tag: string): Promise<void> => {
        await onUpdateChart(chart.id, { tags: chart.tags.filter((item) => item !== tag) });
    };

    const onShare = async (): Promise<void> => {
        const ok = await shareChartUrl(chart.id);
        toast({
            title: ok ? "Share link copied." : "Could not copy link.",
            description: ok ? "Paste it anywhere collaborators can open Loupe." : "Try again.",
            variant: ok ? "success" : "error",
        });
    };

    return (
        <div className={`${styles.listRow}${menu !== null ? ` ${styles.listRowMenuOpen}` : ""}`}>
            <div className={styles.listThumb} onClick={openExport}>
                <img src={thumbnail} alt="" loading="lazy" />
            </div>

            <div className={styles.listMain}>
                <div className={styles.listTitleline}>
                    {renaming ? (
                        <input
                            className={styles.chartTitleInput}
                            autoFocus
                            value={draft}
                            style={{ maxWidth: 360 }}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={() => {
                                void commitRename();
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    void commitRename();
                                }

                                if (event.key === "Escape") {
                                    setDraft(chart.name);
                                    setRenaming(false);
                                }
                            }}
                        />
                    ) : (
                        <span
                            className={`serif ${styles.listTitle}`}
                            onDoubleClick={() => {
                                setDraft(chart.name);
                                setRenaming(true);
                            }}
                        >
                            {chart.name}
                        </span>
                    )}
                    <span className={typeMeta.chipClass}>
                        <span className={styles.typeDot} />
                        {typeMeta.label}
                    </span>
                </div>
                <div className={styles.listSub}>
                    {chart.tags.map((tag) => (
                        <span key={tag} className={styles.chipTag}>
                            {tag}
                        </span>
                    ))}
                    <button
                        type="button"
                        className={`${styles.chipTag} ${styles.chipTagAdd}`}
                        style={{ position: "relative" }}
                        onClick={() => setMenu(menu === "tags" ? null : "tags")}
                    >
                        <IconPlus style={{ width: 10, height: 10 }} /> tag
                    </button>
                    {menu === "tags" ? (
                        <TagEditor
                            chart={chart}
                            onAddTag={(tag) => {
                                void addTag(tag);
                            }}
                            onRemoveTag={(tag) => {
                                void removeTag(tag);
                            }}
                            onClose={() => setMenu(null)}
                            style={{ left: 0, top: "calc(100% + 6px)" }}
                        />
                    ) : null}
                </div>
            </div>

            <div className={styles.listTrailing}>
                <time dateTime={chart.updated_at} className={styles.listTime}>
                    {formatRelativeDate(chart.updated_at)}
                </time>
                <div className={styles.listActions}>
                    <button type="button" className={styles.iconBtn} title="Open" onClick={openExport}>
                        <IconOpen />
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        title="Rename"
                        onClick={() => {
                            setDraft(chart.name);
                            setRenaming(true);
                        }}
                    >
                        <IconEdit />
                    </button>
                    <button
                        type="button"
                        className={styles.iconBtn}
                        title="Share link"
                        onClick={() => {
                            void onShare();
                        }}
                    >
                        <IconShare />
                    </button>
                    <div style={{ position: "relative" }}>
                        <button
                            type="button"
                            className={styles.iconBtn}
                            title="Export"
                            onClick={() => setMenu(menu === "export" ? null : "export")}
                        >
                            <IconDownload />
                        </button>
                        {menu === "export" ? (
                            <>
                                <div className={styles.scrim} onClick={() => setMenu(null)} aria-hidden />
                                <div
                                    className={styles.popover}
                                    style={{ right: 0, top: "calc(100% + 6px)" }}
                                >
                                    <Link
                                        href={exportUrl}
                                        className={styles.popItem}
                                        onClick={() => setMenu(null)}
                                    >
                                        <IconDownload /> Open export
                                    </Link>
                                    <button
                                        type="button"
                                        className={styles.popItem}
                                        onClick={() => {
                                            setMenu(null);
                                            setDeleteOpen(true);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            <DeleteChartButton
                chartId={chart.id}
                chartName={chart.name}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onDeleted={onDeleteChart}
            />
        </div>
    );
};
