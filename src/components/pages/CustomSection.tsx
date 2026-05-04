"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";

type CustomSectionProps = {
    id: string;
    label: string;
    hint?: string;
    children: ReactNode;
    open: string | null;
    setOpen: Dispatch<SetStateAction<string | null>>;
};

export const CustomSection = ({
    id,
    label,
    hint,
    children,
    open,
    setOpen,
}: CustomSectionProps): JSX.Element => {
    const isOpen = open === id;

    return (
        <section className={"custom-section " + (isOpen ? "is-open" : "")}>
            <button
                type="button"
                className="custom-section-head"
                onClick={() => setOpen(isOpen ? null : id)}
            >
                <span className="custom-section-label">{label}</span>
                {hint && <span className="custom-section-hint">{hint}</span>}
                <span className="custom-section-chev">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <div className="custom-section-body">{children}</div>}
        </section>
    );
};
