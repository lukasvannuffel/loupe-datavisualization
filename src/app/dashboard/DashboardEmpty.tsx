import Link from "next/link";

import { RingDivider } from "@/components/primitives/RingDivider";

import { IconPlus } from "./dashboardIcons";
import styles from "./dashboard.module.css";

type DashboardEmptyProps = {
    readonly variant: "zero" | "filtered";
    readonly hasFilters?: boolean;
    readonly onClearFilters?: () => void;
};

export const DashboardEmpty = ({
    variant,
    hasFilters = false,
    onClearFilters,
}: DashboardEmptyProps): JSX.Element => {
    if (variant === "zero") {
        return (
            <section className={styles.dashEmpty}>
                <div className={styles.ringWrap}>
                    <RingDivider />
                </div>
                <h3 className="serif">No charts saved yet.</h3>
                <p>Upload a dataset and export your first publication-ready figure.</p>
                <div className={styles.emptyActions}>
                    <Link href="/upload" className="btn btn--primary">
                        <IconPlus /> Create your first chart
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.dashEmpty}>
            <div className={styles.ringWrap}>
                <RingDivider />
            </div>
            <h3 className="serif">No charts match that.</h3>
            <p>Try a different tag or search term — or start a fresh figure from your finding.</p>
            <div className={styles.emptyActions}>
                {hasFilters ? (
                    <button type="button" className="btn btn--secondary" onClick={onClearFilters}>
                        Clear filters
                    </button>
                ) : null}
                <Link href="/upload" className="btn btn--primary">
                    <IconPlus /> New chart
                </Link>
            </div>
        </section>
    );
};
