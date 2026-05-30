"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
    readonly id: string;
    readonly variant: ToastVariant;
    readonly title: string;
    readonly description?: string;
    readonly durationMs?: number;
}

export interface ToastControls {
    toast: (msg: Omit<ToastMessage, "id">) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}

type ToastContextValue = ToastControls & {
    readonly messages: readonly ToastMessage[];
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;
const MAX_TOASTS = 5;

export const useToast = (): ToastControls => {
    const ctx = useContext(ToastContext);

    if (ctx === null) {
        throw new Error("useToast must be used within ToastProvider");
    }

    return {
        dismiss: ctx.dismiss,
        dismissAll: ctx.dismissAll,
        toast: ctx.toast,
    };
};

export const useToastMessages = (): readonly ToastMessage[] => {
    const ctx = useContext(ToastContext);

    if (ctx === null) {
        throw new Error("useToastMessages must be used within ToastProvider");
    }

    return ctx.messages;
};

export const useToastController = (): ToastContextValue => {
    const [messages, setMessages] = useState<readonly ToastMessage[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string): void => {
        const timer = timersRef.current.get(id);

        if (timer !== undefined) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }

        setMessages((prev) => prev.filter((message) => message.id !== id));
    }, []);

    const dismissAll = useCallback((): void => {
        for (const timer of timersRef.current.values()) {
            clearTimeout(timer);
        }

        timersRef.current.clear();
        setMessages([]);
    }, []);

    const toast = useCallback(
        (msg: Omit<ToastMessage, "id">): void => {
            const id = crypto.randomUUID();
            const durationMs = msg.durationMs ?? DEFAULT_DURATION_MS;
            const entry: ToastMessage = { ...msg, id };

            setMessages((prev) => {
                const next = [...prev, entry];

                if (next.length <= MAX_TOASTS) {
                    return next;
                }

                const overflow = next.length - MAX_TOASTS;
                const removed = next.slice(0, overflow);

                for (const removedMessage of removed) {
                    const timer = timersRef.current.get(removedMessage.id);

                    if (timer !== undefined) {
                        clearTimeout(timer);
                        timersRef.current.delete(removedMessage.id);
                    }
                }

                return next.slice(overflow);
            });

            if (durationMs > 0) {
                const timer = setTimeout(() => {
                    dismiss(id);
                }, durationMs);
                timersRef.current.set(id, timer);
            }
        },
        [dismiss],
    );

    return useMemo(
        () => ({
            dismiss,
            dismissAll,
            messages,
            toast,
        }),
        [dismiss, dismissAll, messages, toast],
    );
};

export { ToastContext, type ToastContextValue };
