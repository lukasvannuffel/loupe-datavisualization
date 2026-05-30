"use client";

import { useRouter } from "next/navigation";

import styles from "./dashboard.module.css";

type DashboardLoadErrorProps = {
    readonly message?: string;
};

export const DashboardLoadError = ({ message }: DashboardLoadErrorProps): JSX.Element => {
    const router = useRouter();

    return (
        <div className={styles.errorState} role="alert">
            <h2 className={styles.errorTitle}>We couldn&apos;t load your charts.</h2>
            <p className="muted">
                {message ?? "Refresh the page to try again. Your saved charts are still in your account."}
            </p>
            <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                    router.refresh();
                }}
            >
                Refresh
            </button>
        </div>
    );
};
