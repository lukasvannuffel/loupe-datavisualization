"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { deleteChart } from "@/app/charts/actions";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/lib/toast/useToast";

import styles from "./dashboard.module.css";

type DeleteChartTriggerHandlers = {
    readonly open: () => void;
};

type DeleteChartButtonProps = {
    readonly chartId: string;
    readonly chartName: string;
    readonly open?: boolean;
    readonly onOpenChange?: (open: boolean) => void;
    readonly renderTrigger?: (handlers: DeleteChartTriggerHandlers) => ReactNode;
};

export const DeleteChartButton = ({
    chartId,
    chartName,
    open: openProp,
    onOpenChange,
    renderTrigger,
}: DeleteChartButtonProps): JSX.Element => {
    const router = useRouter();
    const { toast } = useToast();
    const [internalOpen, setInternalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isControlled = onOpenChange !== undefined;
    const open = isControlled ? (openProp ?? false) : internalOpen;

    const setOpen = (nextOpen: boolean): void => {
        if (isControlled) {
            onOpenChange(nextOpen);
        } else {
            setInternalOpen(nextOpen);
        }
    };

    const onConfirm = async (): Promise<void> => {
        setDeleting(true);
        const result = await deleteChart(chartId);
        setDeleting(false);

        if (!result.success) {
            toast({
                description: "Check your connection and try again.",
                durationMs: 0,
                title: "Chart could not be deleted.",
                variant: "error",
            });
            console.error("[deleteChart]", result.error);
            return;
        }

        toast({
            description: `"${chartName}" was removed from your dashboard.`,
            title: "Chart deleted.",
            variant: "success",
        });
        setOpen(false);
        router.refresh();
    };

    const openDialog = (): void => {
        setOpen(true);
    };

    return (
        <>
            {renderTrigger !== undefined ? (
                renderTrigger({ open: openDialog })
            ) : !isControlled ? (
                <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Delete ${chartName}`}
                    onClick={openDialog}
                >
                    Delete
                </button>
            ) : null}
            <Dialog open={open} onClose={() => setOpen(false)} title={`Delete ${chartName}`}>
                <header className="rerun-head">
                    <div>
                        <h3>{`Delete "${chartName}"?`}</h3>
                        <p className="muted">This cannot be undone.</p>
                    </div>
                </header>
                <div className="rerun-actions">
                    <button
                        type="button"
                        className="btn btn--secondary btn--sm"
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
