"use client";

import type { ReactNode } from "react";

import { ToastContext, useToastController } from "@/lib/toast/useToast";

import { Toast } from "./Toast";
import styles from "./toast.module.css";

type ToastProviderProps = {
    readonly children: ReactNode;
};

export const ToastProvider = ({ children }: ToastProviderProps): JSX.Element => {
    const value = useToastController();

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.viewport} aria-label="Notifications">
                {value.messages.map((message) => (
                    <Toast
                        key={message.id}
                        message={message}
                        onDismiss={value.dismiss}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
