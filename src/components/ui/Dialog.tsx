"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";

type DialogProps = {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly title: string;
    readonly children: ReactNode;
};

export const Dialog = ({ open, onClose, title, children }: DialogProps): JSX.Element | null => {
    const closeRef = useRef<HTMLButtonElement | null>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const scrimPointerDownRef = useRef(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        scrimPointerDownRef.current = false;
        triggerRef.current = document.activeElement as HTMLElement | null;
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        document.body.classList.add("is-locked");
        closeRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.classList.remove("is-locked");
            triggerRef.current?.focus();
        };
    }, [onClose, open]);

    const onScrimPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
        scrimPointerDownRef.current = event.target === event.currentTarget;
    };

    const onScrimClick = (event: MouseEvent<HTMLDivElement>): void => {
        if (scrimPointerDownRef.current && event.target === event.currentTarget) {
            onClose();
        }
        scrimPointerDownRef.current = false;
    };

    if (!open) {
        return null;
    }

    return (
        <div
            className="rerun-scrim"
            onPointerDown={onScrimPointerDown}
            onClick={onScrimClick}
        >
            <div
                className="rerun-panel"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};
