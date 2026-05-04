"use client";

import type { ReactNode } from "react";

type AppStateProviderProps = {
    children: ReactNode;
};

export const AppStateProvider = ({ children }: AppStateProviderProps): JSX.Element => (
    <>{children}</>
);
