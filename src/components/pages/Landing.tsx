"use client";

import { useRouter } from "next/navigation";

import { CHART_PREVIEWS } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingDivider } from "@/components/primitives/RingDivider";
import type { SpecKind } from "@/lib/chartSpec/types";
import { useScrollReveal } from "@/lib/hooks/useScrollReveal";
import { HeroMotion } from "./HeroMotion";
import { TrustPillarFormats, TrustPillarPrivacy, TrustPillarReasoning } from "./TrustPillars";

type LandingChartTile =
    | { kind: "chart"; slug: SpecKind; name: string }
    | { kind: "more"; label: string; description: string };

const CHART_TYPES: readonly LandingChartTile[] = [
    { kind: "chart", slug: "km", name: "Kaplan–Meier" },
    { kind: "chart", slug: "barError", name: "Bar chart with error bars" },
    { kind: "chart", slug: "box", name: "Box-and-whisker" },
    { kind: "chart", slug: "xy", name: "Scatter / line plot" },
    {
        kind: "more",
        label: "+ more coming",
        description: "Forest plot, ROC curve, and more in V2.",
    },
];

export const Landing = (): JSX.Element => {
    const router = useRouter();
    const trustRef = useScrollReveal<HTMLDivElement>();
    const previewHeadRef = useScrollReveal<HTMLDivElement>();
    const previewRowRef = useScrollReveal<HTMLDivElement>();
    const quoteRef = useScrollReveal<HTMLElement>();

    return (
        <div className="page-enter">
            {/* LOUPE-34 mobile audit: no overflow issues found at 380px/320px on 2026-06-03. Screenshot in productiedossier. */}
            <section className="hero">
                <div className="hero-photo" />
                <div className="hero-inner">
                    <div className="container">
                        <div className="hero-copy">
                            <Eyebrow>For medical research</Eyebrow>
                            <h1 className="serif hero-title">
                                <span className="hero-title-line">Start with the finding,</span>
                                <br />
                                <em className="hero-italic">not the format.</em>
                            </h1>
                            <p className="hero-sub">
                                Publication-ready medical charts. No code. No data ever leaves your browser.
                            </p>
                            <div className="hero-cta">
                                <button
                                    type="button"
                                    className="btn btn--primary btn--lg"
                                    onClick={() => router.push("/upload")}
                                >
                                    Start creating <span className="arrow">→</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--quiet btn--lg"
                                    onClick={() => router.push("/library")}
                                >
                                    See supported chart types
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container hero-motion-wrap">
                    <HeroMotion />
                </div>
            </section>

            <RingDivider />

            <section className="container">
                <div ref={trustRef} className="trust-grid reveal">
                    <article className="trust-card">
                        <Eyebrow>01 · Privacy by architecture</Eyebrow>
                        <h3 className="serif trust-title">Your data stays on your device.</h3>
                        <p className="trust-body">
                            Loupe parses your file in the browser. Only column names and your description leave
                            the page — never the rows themselves. The boundary isn&apos;t a promise, it&apos;s
                            the architecture.
                        </p>
                        <div className="trust-figure">
                            <TrustPillarPrivacy />
                        </div>
                    </article>

                    <article className="trust-card">
                        <Eyebrow>02 · Reasoning, not magic</Eyebrow>
                        <h3 className="serif trust-title">The AI explains its choice.</h3>
                        <p className="trust-body">
                            Every recommendation arrives with the alternatives it considered and why it set
                            them aside. You can accept the suggestion, or override it with full context.
                        </p>
                        <div className="trust-figure">
                            <TrustPillarReasoning />
                        </div>
                    </article>

                    <article className="trust-card">
                        <Eyebrow>03 · Built for the literature</Eyebrow>
                        <h3 className="serif trust-title">The chart types journals expect.</h3>
                        <p className="trust-body">
                            Kaplan–Meier, forest, ROC, Bland–Altman, volcano, and the other formats peer review
                            actually asks for — styled to the conventions reviewers recognise.
                        </p>
                        <div className="trust-figure">
                            <TrustPillarFormats />
                        </div>
                    </article>
                </div>
            </section>

            <RingDivider />

            <section className="container">
                <div ref={previewHeadRef} className="library-preview-head reveal">
                    <div>
                        <Eyebrow>Reference</Eyebrow>
                        <h3 className="serif library-preview-title">Charts you can create today.</h3>
                    </div>
                    <button
                        type="button"
                        className="link-arrow"
                        onClick={() => router.push("/library")}
                    >
                        See all supported chart types <span className="arrow">→</span>
                    </button>
                </div>
                <div ref={previewRowRef} className="library-preview-row reveal-stagger">
                    {CHART_TYPES.map((tile) => {
                        if (tile.kind === "more") {
                            return (
                                <div key="more" className="reveal">
                                    <div className="library-preview-card loupe-card">
                                        <div className="library-preview-svg" aria-hidden="true" />
                                        <div className="library-preview-meta">
                                            <span className="serif library-preview-name">{tile.label}</span>
                                            <p className="trust-body muted">{tile.description}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        const Preview = CHART_PREVIEWS[tile.slug];

                        return (
                            <div key={tile.slug} className="reveal">
                                <div className="library-preview-card loupe-card">
                                    <div className="library-preview-svg">
                                        <Preview responsive />
                                    </div>
                                    <div className="library-preview-meta">
                                        <span className="serif library-preview-name">{tile.name}</span>
                                    </div>
                                    <div className="focus-ring" style={{ left: "50%", top: "50%" }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section ref={quoteRef} className="container quote-band reveal">
                <p className="serif quote-body">
                    “We describe what we found. Loupe knows the figure that says it.”
                </p>
                <p className="quote-cite">Department of Surgery · Erasmus MC</p>
            </section>
        </div>
    );
};
