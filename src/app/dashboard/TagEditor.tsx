"use client";

import { useState, type CSSProperties } from "react";

import type { ChartListItem } from "@/lib/charts/listCharts";

import { IconX } from "./dashboardIcons";
import { normalizeTag } from "./dashboardUtils";
import styles from "./dashboard.module.css";

type TagEditorProps = {
    readonly chart: ChartListItem;
    readonly onAddTag: (tag: string) => void;
    readonly onRemoveTag: (tag: string) => void;
    readonly onClose: () => void;
    readonly style?: CSSProperties;
};

export const TagEditor = ({
    chart,
    onAddTag,
    onRemoveTag,
    onClose,
    style,
}: TagEditorProps): JSX.Element => {
    const [value, setValue] = useState("");

    const commitTag = (): void => {
        const normalized = normalizeTag(value);
        if (normalized === "") {
            return;
        }

        onAddTag(normalized);
        setValue("");
    };

    return (
        <>
            <div className={styles.scrim} onClick={onClose} aria-hidden />
            <div
                className={`${styles.popover} ${styles.tagPop}`}
                style={style}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-label="Edit tags"
            >
                <div className={styles.tagPopRow}>
                    {chart.tags.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--gray-2)" }}>No tags yet</span>
                    ) : null}
                    {chart.tags.map((tag) => (
                        <span key={tag} className={styles.chipTagEditing}>
                            {tag}
                            <button
                                type="button"
                                className={styles.chipRemove}
                                aria-label={`Remove ${tag}`}
                                onClick={() => onRemoveTag(tag)}
                            >
                                <IconX style={{ width: 10, height: 10 }} />
                            </button>
                        </span>
                    ))}
                </div>
                <input
                    autoFocus
                    value={value}
                    placeholder="Add a tag, press Enter"
                    className={styles.tagPopInput}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            commitTag();
                        }

                        if (event.key === "Escape") {
                            onClose();
                        }
                    }}
                />
                <p className={styles.tagPopHint}>Lowercase · spaces become hyphens</p>
            </div>
        </>
    );
};
