"use client";

import { useEffect, useState, type ReactNode } from "react";

import { deleteChart } from "@/app/charts/actions";
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
    readonly onDeleted?: (id: string) => void;
    readonly renderTrigger?: (handlers: DeleteChartTriggerHandlers) => ReactNode;
};

export const DeleteChartButton = ({
    chartId,
    chartName,
    open: openProp,
    onOpenChange,
    onDeleted,
    renderTrigger,
}: DeleteChartButtonProps): JSX.Element => {
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

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") {
                return;
            }

            if (isControlled) {
                onOpenChange?.(false);
            } else {
                setInternalOpen(false);
            }
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isControlled, onOpenChange, open]);

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

        setOpen(false);
        onDeleted?.(chartId);
        toast({
            description: `"${chartName}" was removed from your dashboard.`,
            title: "Chart deleted.",
            variant: "success",
        });
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
            {open ? (
                <div
                    className={styles.deleteOverlay}
                    role="presentation"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className={styles.deletePanel}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Delete ${chartName}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 className={styles.deleteTitle}>{`Delete "${chartName}"?`}</h3>
                        <p className={styles.deleteHint}>This cannot be undone.</p>
                        <div className={styles.deleteActions}>
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
                    </div>
                </div>
            ) : null}
        </>
    );
};
