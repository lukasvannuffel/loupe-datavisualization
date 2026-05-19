"use client";

import { useEffect } from "react";

import { CHART_PREVIEWS } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import type { ChartSpec } from "@/lib/chartSpec/types";

const CHOICES: readonly { slug: ChartSpec["kind"]; name: string; use: string }[] = [
    { slug: "km", name: "Kaplan–Meier", use: "Time-to-event with censoring" },
    { slug: "barError", name: "Bar with error bars", use: "Group means · SD / SEM / CI" },
    { slug: "box", name: "Box plot", use: "Distribution by group" },
    { slug: "xy", name: "XY plot", use: "Line or scatter · continuous variables" },
];

type RecommendationOverrideProps = {
    open: boolean;
    onClose: () => void;
    current: ChartSpec["kind"];
    onSelect: (kind: ChartSpec["kind"]) => void;
};

export const RecommendationOverride = ({
    open,
    onClose,
    current,
    onSelect,
}: RecommendationOverrideProps): JSX.Element | null => {
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);
        document.body.classList.add("is-locked");

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div className="override-scrim" onClick={onClose}>
            <div
                className="override-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Choose a different chart"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="override-head">
                    <div>
                        <Eyebrow>Override</Eyebrow>
                        <h3>Pick a different chart shape.</h3>
                        <p className="muted">Override the recommendation — the receipt records the swap.</p>
                    </div>
                    <button
                        type="button"
                        className="override-close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>
                <div className="override-grid">
                    {CHOICES.map((c) => {
                        const Preview = CHART_PREVIEWS[c.slug];
                        const isCurrent = c.slug === current;

                        return (
                            <button
                                key={c.slug}
                                type="button"
                                className={"override-card " + (isCurrent ? "is-active" : "")}
                                onClick={() => {
                                    if (!isCurrent) {
                                        onSelect(c.slug);
                                    }
                                    onClose();
                                }}
                            >
                                <div className="override-card-thumb">
                                    <Preview w={140} h={80} />
                                </div>
                                <div className="override-card-meta">
                                    <span className="override-card-name">{c.name}</span>
                                    <span className="override-card-use muted">{c.use}</span>
                                </div>
                                {isCurrent && <span className="override-card-tag">Current</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
