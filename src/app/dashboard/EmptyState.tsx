import Link from "next/link";

import styles from "./dashboard.module.css";

export const EmptyState = (): JSX.Element => {
    return (
        <section className={styles.emptyState}>
            <h2 className={`serif ${styles.emptyTitle}`}>No charts saved yet.</h2>
            <p className={styles.emptyBody}>
                Upload a dataset and export your first publication-ready figure.
            </p>
            <Link href="/upload" className="btn btn--primary">
                Create your first chart →
            </Link>
        </section>
    );
};
