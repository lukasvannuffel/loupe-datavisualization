import Link from "next/link";

import styles from "./dashboard.module.css";

export const EmptyState = (): JSX.Element => {
    return (
        <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No charts yet</h2>
            <p className={styles.emptyBody}>
                Upload a dataset to create your first publication-ready figure.
            </p>
            <Link href="/upload" className="btn btn--primary btn--lg">
                Upload dataset
            </Link>
        </section>
    );
};
