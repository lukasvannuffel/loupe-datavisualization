"use client";

/**
 * Route decision: dedicated `/recommend/choose` page rather than an inline step on
 * `/recommend`. Rationale:
 *   1. `/recommend` already owns the full AI-recommended chart view + override
 *      modal. Inlining a chooser conditionally would mean Recommendation.tsx now
 *      renders three distinct screens depending on `selectionMode` — that's two
 *      product concerns in one component.
 *   2. A discrete URL makes the funnel explicit, lets us deep-link the chooser
 *      from anywhere (e.g. "switch back to chart picker") and keeps the AI page
 *      free to redirect *into* the chooser when `selectionMode === null`.
 *   3. URL hierarchy stays clean: `/recommend` (AI flow, default) + sibling
 *      `/recommend/choose` and `/recommend/manual`.
 */

import { useRouter } from "next/navigation";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState, type SelectionMode } from "@/app/providers";

type ChoiceCard = {
    readonly mode: SelectionMode;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly cta: string;
    readonly route: "/recommend" | "/recommend/manual";
};

const CHOICES: readonly ChoiceCard[] = [
    {
        mode: "ai",
        eyebrow: "Guided",
        title: "Let AI recommend a chart",
        description:
            "Loupe reads your intent and column types, then proposes the chart that fits — with reasoning you can audit and override.",
        cta: "Let AI recommend a chart",
        route: "/recommend",
    },
    {
        mode: "manual",
        eyebrow: "Direct",
        title: "I know what I need",
        description:
            "Pick the chart yourself. The mapping you just made is preserved; you skip the recommendation and go straight to configuration.",
        cta: "Pick a chart myself",
        route: "/recommend/manual",
    },
];

export const RecommendChoose = (): JSX.Element => {
    const router = useRouter();
    const { setSelectionMode } = useAppState();

    const onChoose = (choice: ChoiceCard): void => {
        setSelectionMode(choice.mode);
        router.push(choice.route);
    };

    return (
        <div className="choose-page page-enter">
            <div className="container container--narrow">
                <div className="choose-head">
                    <Eyebrow>Step 3 · Choose your path</Eyebrow>
                    <h1 id="choose-heading" className="choose-title">
                        How would you like to pick a chart?
                    </h1>
                    <p className="choose-sub muted">
                        Both paths use the same data and the same editor. Pick whichever matches
                        how you want to work today — you can switch back at any time without
                        losing your column mapping or your finding.
                    </p>
                </div>

                <div
                    className="choose-grid"
                    role="group"
                    aria-labelledby="choose-heading"
                    data-testid="choose-grid"
                >
                    {CHOICES.map((choice) => (
                        <article key={choice.mode} className="choose-card">
                            <Eyebrow>{choice.eyebrow}</Eyebrow>
                            <h2 className="choose-card-title">{choice.title}</h2>
                            <p className="choose-card-body">{choice.description}</p>
                            <button
                                type="button"
                                className="btn btn--primary btn--lg choose-card-cta"
                                data-testid={`choose-cta-${choice.mode}`}
                                onClick={() => onChoose(choice)}
                            >
                                {choice.cta} <span className="arrow">→</span>
                            </button>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
};
