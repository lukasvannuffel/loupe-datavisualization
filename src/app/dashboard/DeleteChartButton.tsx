"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteChart } from "@/app/charts/actions";
import { Dialog } from "@/components/ui/Dialog";

import styles from "./dashboard.module.css";

type DeleteChartButtonProps = {
    readonly chartId: string;
    readonly chartName: string;
};

export const DeleteChartButton = ({ chartId, chartName }: DeleteChartButtonProps): JSX.Element => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onConfirm = async (): Promise<void> => {
        setDeleting(true);
        setError(null);
        const result = await deleteChart(chartId);
        setDeleting(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        setOpen(false);
        router.refresh();
    };

    return (
        <>
            <button
                type="button"
                className={styles.deleteButton}
                aria-label={`Delete ${chartName}`}
                onClick={() => setOpen(true)}
            >
                Delete
            </button>
            <Dialog open={open} onClose={() => setOpen(false)} title={`Delete ${chartName}`}>
                <header className="rerun-head">
                    <div>
                        <h3>{`Delete "${chartName}"?`}</h3>
                        <p className="muted">This cannot be undone.</p>
                    </div>
                </header>
                {error !== null ? (
                    <p role="alert" className="muted">
                        {error}
                    </p>
                ) : null}
                <div className="rerun-actions">
                    <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={deleting}
                        onClick={() => {
                            void onConfirm();
                        }}
                    >
                        {deleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </Dialog>
        </>
    );
};
