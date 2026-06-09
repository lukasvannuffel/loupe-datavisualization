"use client";

import styles from "./dashboard.module.css";

type DashboardTagFilterProps = {
    readonly totalCount: number;
    readonly tags: readonly { readonly tag: string; readonly count: number }[];
    readonly activeTag: string | null;
    readonly onTagChange: (tag: string | null) => void;
};

export const DashboardTagFilter = ({
    totalCount,
    tags,
    activeTag,
    onTagChange,
}: DashboardTagFilterProps): JSX.Element | null => {
    if (tags.length === 0) {
        return null;
    }

    return (
        <div className={styles.dashTags} role="group" aria-label="Filter by tag">
            <span className={styles.tagLabel}>Tags</span>
            <button
                type="button"
                className={`${styles.tagPill} all${activeTag === null ? ` ${styles.tagPillAllActive}` : ""}`}
                onClick={() => onTagChange(null)}
            >
                All <span className={styles.tagCount}>{totalCount}</span>
            </button>
            {tags.map(({ tag, count }) => {
                const isActive = activeTag === tag;

                return (
                    <button
                        key={tag}
                        type="button"
                        className={`${styles.tagPill}${isActive ? ` ${styles.tagPillActive}` : ""}`}
                        onClick={() => onTagChange(isActive ? null : tag)}
                    >
                        {tag} <span className={styles.tagCount}>{count}</span>
                    </button>
                );
            })}
        </div>
    );
};
