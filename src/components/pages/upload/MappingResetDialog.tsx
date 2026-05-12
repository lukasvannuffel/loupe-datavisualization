"use client";

import { useEffect, useRef } from "react";

export type MappingResetDialogProps = {
    onCancel: () => void;
    onConfirm: () => void;
    open: boolean;
};

export const MappingResetDialog = ({
    onCancel,
    onConfirm,
    open,
}: MappingResetDialogProps): JSX.Element | null => {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const confirmRef = useRef<HTMLButtonElement | null>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
        confirmRef.current?.focus();

        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
            }
        };

        window.addEventListener("keydown", onKey);
        document.body.classList.add("is-locked");

        const panel = panelRef.current;

        const trapFocus = (event: KeyboardEvent): void => {
            if (event.key !== "Tab" || panel === null) {
                return;
            }

            const nodes = Array.from(
                panel.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            );

            if (nodes.length === 0) {
                return;
            }

            const first = nodes[0];
            const last = nodes[nodes.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                }
            } else if (document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };

        panel?.addEventListener("keydown", trapFocus);

        return () => {
            window.removeEventListener("keydown", onKey);
            panel?.removeEventListener("keydown", trapFocus);
            document.body.classList.remove("is-locked");
            previouslyFocusedRef.current?.focus?.();
        };
    }, [open, onCancel]);

    if (!open) {
        return null;
    }

    return (
        <div className="mapping-reset-scrim" onClick={onCancel}>
            <div
                ref={panelRef}
                className="mapping-reset-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mapping-reset-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 className="serif" id="mapping-reset-title">
                    Switch worksheet?
                </h3>
                <p className="muted mapping-reset-body">
                    Switching sheet will reset your column mapping. Continue?
                </p>
                <div className="mapping-reset-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={onConfirm}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};
