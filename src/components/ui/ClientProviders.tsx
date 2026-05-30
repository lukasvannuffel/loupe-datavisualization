"use client";

import type { ReactNode } from "react";

import { AppStateProvider } from "@/app/providers";

import { ToastProvider } from "./ToastProvider";

type ClientProvidersProps = {
    readonly children: ReactNode;
};

export const ClientProviders = ({ children }: ClientProvidersProps): JSX.Element => {
    return (
        <ToastProvider>
            <AppStateProvider>{children}</AppStateProvider>
        </ToastProvider>
    );
};
