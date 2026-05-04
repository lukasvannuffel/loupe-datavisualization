"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type AppState = {
    authed: boolean;
    setAuthed: (next: boolean) => void;
};

const AppStateContext = createContext<AppState | null>(null);

type AppStateProviderProps = {
    children: ReactNode;
};

export const AppStateProvider = ({ children }: AppStateProviderProps): JSX.Element => {
    const [authed, setAuthed] = useState<boolean>(false);

    return (
        <AppStateContext.Provider value={{ authed, setAuthed }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = (): AppState => {
    const ctx = useContext(AppStateContext);
    if (ctx === null) {
        throw new Error("useAppState must be used within an AppStateProvider");
    }

    return ctx;
};
