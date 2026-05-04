"use client";

import { useRouter } from "next/navigation";

import { CHART_PREVIEWS, type ChartSlug } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";

type LibraryEntry = {
    slug: ChartSlug;
    name: string;
    when: string;
    eg: string;
};

const LIBRARY: readonly LibraryEntry[] = [
    {
        slug: "km",
        name: "Kaplan–Meier curve",
        when: "Time-to-event with right-censoring; comparing survival between two or more groups across a follow-up window.",
        eg: "Does treatment A improve 5-year survival vs B?",
    },
    {
        slug: "forest",
        name: "Forest plot",
        when: "Comparing effect sizes (hazard ratios, odds ratios) across pre-specified subgroups or studies in one figure.",
        eg: "Is the treatment effect consistent across age, sex and stage?",
    },
    {
        slug: "box",
        name: "Box-and-whisker",
        when: "Distributional comparison of a continuous variable across a small number of categories.",
        eg: "How does tumor size differ across stages I–IV?",
    },
    {
        slug: "violin",
        name: "Violin plot",
        when: "Distributional comparison where shape (bimodality, skew) matters as much as the median.",
        eg: "Are biomarker concentrations bimodal between responders and non-responders?",
    },
    {
        slug: "roc",
        name: "ROC curve",
        when: "Diagnostic accuracy of a binary classifier across thresholds; reporting AUC.",
        eg: "How well does the new assay discriminate disease status?",
    },
    {
        slug: "volcano",
        name: "Volcano plot",
        when: "Many simultaneous comparisons against effect size and significance — typically differential expression or proteomics.",
        eg: "Which genes differ between responders and non-responders?",
    },
    {
        slug: "bland",
        name: "Bland–Altman",
        when: "Agreement between two measurement methods on the same units; visualises bias and limits.",
        eg: "Does the new assay agree with the reference method?",
    },
    {
        slug: "funnel",
        name: "Funnel plot",
        when: "Detecting publication bias or small-study effects in meta-analysis.",
        eg: "Is there evidence of small-study bias in this meta-analysis?",
    },
    {
        slug: "spaghetti",
        name: "Spaghetti plot",
        when: "Individual longitudinal trajectories — repeated measures per patient over time.",
        eg: "How does FEV1 change per patient over 12 months?",
    },
    {
        slug: "barError",
        name: "Bar with error bars",
        when: "Comparing group means with explicit uncertainty — SD, SEM, or 95% CI per bar.",
        eg: "How does survival probability differ across stages I–IV?",
    },
    {
        slug: "groupedBar",
        name: "Grouped bar",
        when: "Two series compared side-by-side across the same categories or time points.",
        eg: "How do response rates evolve over baseline, 3, 6, 12 months in each arm?",
    },
    {
        slug: "dot",
        name: "Cleveland dot plot",
        when: "Ranking a single series across many categories — cleaner than bars past 6 entries.",
        eg: "Which checkpoint inhibitor has the highest objective response rate?",
    },
    {
        slug: "bar",
        name: "Bar chart",
        when: "Comparing single-series counts or means across a small set of categories — no uncertainty needed.",
        eg: "How many patients per stage at baseline?",
    },
    {
        slug: "barHorizontal",
        name: "Horizontal bar",
        when: "Same as bar, but with long category names that would crowd a vertical x-axis.",
        eg: "Which adverse events were most frequent in this trial?",
    },
    {
        slug: "stackedBar",
        name: "Stacked bar",
        when: "Composition within categories — counts of each subgroup per category, totals visible.",
        eg: "Adverse-event grades I–IV per treatment arm.",
    },
    {
        slug: "stackedBar100",
        name: "100% stacked bar",
        when: "Proportional composition where the relative split matters more than the absolute total.",
        eg: "Share of response categories per regimen.",
    },
    {
        slug: "line",
        name: "Line chart",
        when: "Continuous trend over time or an ordered x-axis — one or two series.",
        eg: "Mean tumor diameter at each cycle, by arm.",
    },
    {
        slug: "scatter",
        name: "Scatter plot",
        when: "Two continuous variables, optionally with a fitted regression line.",
        eg: "Does baseline biomarker predict response magnitude?",
    },
    {
        slug: "histogram",
        name: "Histogram",
        when: "Distribution of a single continuous variable — shape, spread, skew.",
        eg: "Distribution of age at diagnosis.",
    },
    {
        slug: "pie",
        name: "Pie chart",
        when: "Single-level proportions of a small whole — six slices or fewer.",
        eg: "Patient distribution across primary tumor sites.",
    },
    {
        slug: "donut",
        name: "Donut chart",
        when: "Same as pie, with a focal headline number anchored in the centre.",
        eg: "Overall response rate at week 12.",
    },
    {
        slug: "lollipop",
        name: "Lollipop chart",
        when: "Ranking many categories where bars get visually noisy — cleaner stems and dots.",
        eg: "Top-15 most frequent concomitant medications.",
    },
    {
        slug: "pairedPlot",
        name: "Paired plot",
        when: "Same-subject change between two timepoints — pre vs post, lines connect each patient.",
        eg: "Did each patient's QoL score improve from baseline to month 6?",
    },
    {
        slug: "sankey",
        name: "Sankey diagram",
        when: "Flows between stages — patient pathway, treatment switching, CONSORT-style enrolment.",
        eg: "How did patients move from screening through randomisation to outcome?",
    },
    {
        slug: "sunburst",
        name: "Sunburst chart",
        when: "Multi-level hierarchical proportions — pie can't carry the depth.",
        eg: "Diagnosis → subtype → mutation status across the cohort.",
    },
];

export const Library = (): JSX.Element => {
    const router = useRouter();

    return (
        <div className="library-page page-enter">
            <div className="container">
                <div className="library-hero">
                    <Eyebrow>Reference</Eyebrow>
                    <h1 className="library-hero-title">
                        Loupe knows these chart types. You don&apos;t have to.
                    </h1>
                    <p className="library-hero-sub">You describe the finding. Loupe chooses the format.</p>
                </div>
            </div>

            <div className="container" style={{ marginTop: 0 }}>
                <div className="library-grid">
                    {LIBRARY.map((c) => {
                        const Preview = CHART_PREVIEWS[c.slug];

                        return (
                            <article key={c.slug} className="library-card loupe-card">
                                <div className="library-card-svg">
                                    <Preview responsive />
                                </div>
                                <h3 className="library-card-name">{c.name}</h3>
                                <p className="library-card-when">
                                    <strong className="library-card-when-label">Use when —</strong>{" "}
                                    {c.when}
                                </p>
                                <p className="library-card-eg">e.g. {c.eg}</p>
                                <div className="focus-ring" style={{ left: "50%", top: "30%" }} />
                            </article>
                        );
                    })}
                </div>

                <div className="library-cta-band">
                    <Eyebrow>You don&apos;t pick it. You describe it.</Eyebrow>
                    <h2 className="library-cta-title">Start with your finding.</h2>
                    <button
                        type="button"
                        className="btn btn--primary btn--lg"
                        onClick={() => router.push("/upload")}
                    >
                        Start creating <span className="arrow">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
