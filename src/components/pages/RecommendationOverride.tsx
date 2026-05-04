"use client";

import { useEffect } from "react";

import { CHART_PREVIEWS, type ChartSlug } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";

type ChartChoice = {
    slug: ChartSlug;
    name: string;
    use: string;
};

const CHOICES: readonly ChartChoice[] = [
    { slug: "km", name: "Kaplan–Meier", use: "Time-to-event with censoring" },
    { slug: "forest", name: "Forest plot", use: "Many subgroup HRs" },
    { slug: "barError", name: "Bar with error bars", use: "Group means · SD / SEM / CI" },
    { slug: "groupedBar", name: "Grouped bar", use: "Two series across categories" },
    { slug: "dot", name: "Cleveland dot plot", use: "Ranked single-series comparison" },
    { slug: "box", name: "Box plot", use: "Distribution by group" },
    { slug: "violin", name: "Violin plot", use: "Density-shaped distributions" },
    { slug: "roc", name: "ROC curve", use: "Diagnostic performance" },
    { slug: "volcano", name: "Volcano plot", use: "Differential expression / many tests" },
    { slug: "bland", name: "Bland–Altman", use: "Two-method agreement" },
    { slug: "funnel", name: "Funnel plot", use: "Meta-analysis bias check" },
    { slug: "spaghetti", name: "Spaghetti plot", use: "Per-subject trajectories" },
];

type RecommendationOverrideProps = {
    open: boolean;
    onClose: () => void;
    current: ChartSlug;
    onSelect: (slug: ChartSlug) => void;
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
                        <p className="muted">
                            Loupe&apos;s recommendation is based on your finding and column types. You can
                            override it — the receipt records the swap.
                        </p>
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
                                    onSelect(c.slug);
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
