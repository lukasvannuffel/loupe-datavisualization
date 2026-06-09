"use client";

import {
    IconCheck,
    IconChev,
    IconGrid,
    IconGroup,
    IconList,
    IconSearch,
    IconSort,
    IconX,
} from "./dashboardIcons";
import type { DashboardSort, DashboardView } from "./dashboardUtils";
import styles from "./dashboard.module.css";

type DashboardToolbarProps = {
    readonly query: string;
    readonly sort: DashboardSort;
    readonly view: DashboardView;
    readonly grouped: boolean;
    readonly onQueryChange: (value: string) => void;
    readonly onSortChange: (value: DashboardSort) => void;
    readonly onViewChange: (value: DashboardView) => void;
    readonly onGroupedChange: (value: boolean) => void;
};

export const DashboardToolbar = ({
    query,
    sort,
    view,
    grouped,
    onQueryChange,
    onSortChange,
    onViewChange,
    onGroupedChange,
}: DashboardToolbarProps): JSX.Element => {
    return (
        <div className={styles.dashToolbar}>
            <div className={styles.dashSearch}>
                <IconSearch />
                <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Search by title, tag or chart type…"
                    aria-label="Search charts"
                />
                {query.length > 0 ? (
                    <button
                        type="button"
                        className={styles.searchClear}
                        aria-label="Clear search"
                        onClick={() => onQueryChange("")}
                    >
                        <IconX />
                    </button>
                ) : null}
            </div>

            <div className={styles.dashSelect}>
                <IconSort
                    style={{
                        position: "absolute",
                        left: 11,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: "var(--gray)",
                    }}
                />
                <select
                    value={sort}
                    onChange={(event) => onSortChange(event.target.value as DashboardSort)}
                    aria-label="Sort charts"
                >
                    <option value="recent">Recently updated</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="type">Chart type</option>
                </select>
                <span className={styles.dashSelectChev}>
                    <IconChev />
                </span>
            </div>

            <button
                type="button"
                className={`${styles.dashTool}${grouped ? ` ${styles.dashToolOn}` : ""}`}
                aria-pressed={grouped}
                onClick={() => onGroupedChange(!grouped)}
            >
                <IconGroup /> Group by type
                {grouped ? <IconCheck style={{ width: 12, height: 12, color: "var(--amber)" }} /> : null}
            </button>

            <div className={styles.seg} role="group" aria-label="View">
                <button
                    type="button"
                    className={view === "grid" ? styles.segActive : undefined}
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => onViewChange("grid")}
                >
                    <IconGrid />
                </button>
                <button
                    type="button"
                    className={view === "list" ? styles.segActive : undefined}
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    onClick={() => onViewChange("list")}
                >
                    <IconList />
                </button>
            </div>
        </div>
    );
};
