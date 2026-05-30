"use client";

import type { ToastMessage } from "@/lib/toast/useToast";

import styles from "./toast.module.css";

type ToastProps = {
    readonly message: ToastMessage;
    readonly onDismiss: (id: string) => void;
};

export const Toast = ({ message, onDismiss }: ToastProps): JSX.Element => {
    return (
        <div
            className={`${styles.toast} ${styles[message.variant]}`}
            role={message.variant === "error" ? "alert" : "status"}
            aria-live={message.variant === "error" ? "assertive" : "polite"}
        >
            <div className={styles.content}>
                <p className={styles.title}>{message.title}</p>
                {message.description !== undefined && message.description !== "" ? (
                    <p className={styles.description}>{message.description}</p>
                ) : null}
            </div>
            <button
                type="button"
                className={styles.close}
                aria-label="Dismiss notification"
                onClick={() => {
                    onDismiss(message.id);
                }}
            >
                ×
            </button>
        </div>
    );
};
