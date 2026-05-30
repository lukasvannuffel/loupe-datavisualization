"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";

import { CHART_PREVIEWS, type ChartSlug } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { greetingByHour } from "@/lib/profile";
import { useToast } from "@/lib/toast/useToast";
import { ReRunModal } from "./ReRunModal";

type ChartCard = {
    name: string;
    time: string;
    slug: ChartSlug;
    tokens: readonly string[];
};

type Project = {
    id: string;
    name: string;
    note: string;
    updated: string;
    style: readonly string[];
    charts: readonly ChartCard[];
};

const PROJECTS: readonly Project[] = [
    {
        id: "p1",
        name: "PROSPER-2 trial figures",
        note: "Phase III · breast cancer · cohort A vs B",
        updated: "Apr 24",
        style: ["a", "b"],
        charts: [
            { name: "Five-year overall survival", time: "Apr 24, 14:32", slug: "km", tokens: ["a", "b"] },
            { name: "Subgroup hazard ratios", time: "Apr 22, 09:11", slug: "forest", tokens: ["a", "b"] },
            { name: "Tumor size by stage", time: "Apr 20, 16:58", slug: "box", tokens: ["a", "b"] },
            {
                name: "Disease-free survival, sensitivity",
                time: "Apr 18, 11:02",
                slug: "km",
                tokens: ["a", "b"],
            },
        ],
    },
    {
        id: "p2",
        name: "Concordance study — assays",
        note: "Method comparison · n=312",
        updated: "Apr 15",
        style: ["c", "d"],
        charts: [
            { name: "Bland–Altman, panel A", time: "Apr 15, 10:21", slug: "bland", tokens: ["c", "d"] },
            { name: "ROC of new assay", time: "Apr 12, 17:40", slug: "roc", tokens: ["c", "d"] },
            { name: "Concordance violin", time: "Apr 10, 09:55", slug: "violin", tokens: ["c", "d"] },
        ],
    },
    {
        id: "p3",
        name: "Tumor transcriptomics",
        note: "Differential expression · responders vs non",
        updated: "Mar 28",
        style: ["e", "f"],
        charts: [
            { name: "Volcano, primary contrast", time: "Mar 28, 12:12", slug: "volcano", tokens: ["e", "f"] },
            { name: "Boxplot of top-20 genes", time: "Mar 26, 18:00", slug: "box", tokens: ["e", "f"] },
        ],
    },
];

type RecentEntry = {
    name: string;
    time: string;
    slug: ChartSlug;
};

const RECENT: readonly RecentEntry[] = [
    { name: "Five-year overall survival", time: "today, 14:32", slug: "km" },
    { name: "Subgroup hazard ratios", time: "Apr 22", slug: "forest" },
    { name: "Bland–Altman, panel A", time: "Apr 15", slug: "bland" },
    { name: "Volcano, primary contrast", time: "Mar 28", slug: "volcano" },
];

const DPI_OPTIONS: readonly number[] = [300, 600, 1200];

type CardMenuKey = string;

type ReRunTarget = {
    name: string;
} | null;

type DashboardProps = {
    displayName: string;
    affiliation: string | null;
};

export const Dashboard = ({ displayName, affiliation }: DashboardProps): JSX.Element => {
    const router = useRouter();
    const { toast } = useToast();
    const [hoverProject, setHoverProject] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<CardMenuKey | null>(null);
    const [reRunTarget, setReRunTarget] = useState<ReRunTarget>(null);
    const [greeting, setGreeting] = useState<string>("Welcome back");

    useEffect(() => {
        // Computed on the client to avoid SSR/UTC vs browser-local timezone hydration mismatch.
        setGreeting(greetingByHour(new Date().getHours()));
    }, []);

    useEffect(() => {
        if (openMenu === null) {
            return;
        }

        const onClick = (): void => setOpenMenu(null);
        window.addEventListener("click", onClick);

        return () => window.removeEventListener("click", onClick);
    }, [openMenu]);

    const onKebabClick = (key: CardMenuKey, e: ReactMouseEvent): void => {
        e.stopPropagation();
        setOpenMenu(openMenu === key ? null : key);
    };

    const onDownload = (label: string, e: ReactMouseEvent): void => {
        e.stopPropagation();
        toast({
            title: `Saved · ${label}`,
            variant: "success",
        });
        setOpenMenu(null);
    };

    const onReRun = (name: string, e: ReactMouseEvent): void => {
        e.stopPropagation();
        setOpenMenu(null);
        setReRunTarget({ name });
    };

    const renderMenu = (key: CardMenuKey, name: string): JSX.Element | null => {
        if (openMenu !== key) {
            return null;
        }

        return (
            <div className="kebab-menu" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="kebab-item"
                    onClick={(e) => onDownload("SVG", e)}
                >
                    Download SVG
                </button>
                {DPI_OPTIONS.map((d) => (
                    <button
                        key={d}
                        type="button"
                        className="kebab-item"
                        onClick={(e) => onDownload(`PNG · ${d} dpi`, e)}
                    >
                        Download PNG · {d} dpi
                    </button>
                ))}
                <div className="kebab-divider" />
                <button
                    type="button"
                    className="kebab-item"
                    onClick={(e) => onReRun(name, e)}
                >
                    Re-run with new data
                </button>
            </div>
        );
    };

    return (
        <div className="page-enter">
            <div className="container">
                <header className="dash-profile">
                    <div>
                        <Eyebrow>Workspace</Eyebrow>
                        <h1 className="dash-greeting">{`${greeting}, ${displayName}.`}</h1>
                        {affiliation !== null && affiliation !== "" ? (
                            <p className="dash-affil">{affiliation}</p>
                        ) : null}
                    </div>
                    <div className="dash-profile-actions">
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => router.push("/account")}
                        >
                            Settings
                        </button>
                        <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => router.push("/upload")}
                        >
                            New chart
                        </button>
                    </div>
                </header>

                <section className="dash-section">
                    <div className="dash-section-head">
                        <div>
                            <Eyebrow>Projects</Eyebrow>
                            <h3 className="dash-section-title">Three studies in progress.</h3>
                        </div>
                        <button type="button" className="link-arrow">
                            New project <span className="arrow">→</span>
                        </button>
                    </div>

                    <div className="shelf">
                        {PROJECTS.map((p) => (
                            <div
                                key={p.id}
                                className={"shelf-row " + (hoverProject === p.id ? "is-hovered" : "")}
                                onMouseEnter={() => setHoverProject(p.id)}
                                onMouseLeave={() => setHoverProject(null)}
                            >
                                <div className="shelf-meta">
                                    <Eyebrow withDot={false}>UPDATED {p.updated}</Eyebrow>
                                    <h4>{p.name}</h4>
                                    <p>{p.note}</p>
                                    <div className="shelf-card-tokens shelf-meta-tokens">
                                        {p.style.map((s) => (
                                            <span key={s} className="match" />
                                        ))}
                                        <span className="shelf-meta-tokens-label">shared style</span>
                                    </div>
                                    <Link
                                        href={`/project/${p.id}/style`}
                                        className="btn btn--quiet btn--sm shelf-style-link"
                                    >
                                        Edit shared style →
                                    </Link>
                                </div>
                                <div className="shelf-charts">
                                    {p.charts.map((c, i) => {
                                        const Preview = CHART_PREVIEWS[c.slug];
                                        const key = `${p.id}-${i}`;

                                        return (
                                            <div
                                                key={i}
                                                className="shelf-card"
                                                onClick={() => router.push("/recommend")}
                                            >
                                                <div className="shelf-card-preview">
                                                    <Preview responsive />
                                                </div>
                                                <div className="shelf-card-name">{c.name}</div>
                                                <div className="shelf-card-time">{c.time}</div>
                                                <div className="shelf-card-tokens">
                                                    {c.tokens.map((t) => (
                                                        <span key={t} className="match" />
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="kebab-button"
                                                    aria-label={`Open menu for ${c.name}`}
                                                    onClick={(e) => onKebabClick(key, e)}
                                                >
                                                    ⋯
                                                </button>
                                                {renderMenu(key, c.name)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="dash-section">
                    <div className="dash-section-head">
                        <div>
                            <Eyebrow>Saved charts</Eyebrow>
                            <h3 className="dash-section-title">Recent figures.</h3>
                        </div>
                    </div>
                    <div className="recent-grid">
                        {RECENT.map((c, i) => {
                            const Preview = CHART_PREVIEWS[c.slug];
                            const key = `recent-${i}`;

                            return (
                                <div
                                    key={i}
                                    className="recent-card"
                                    onClick={() => router.push("/export")}
                                >
                                    <div className="recent-card-preview">
                                        <Preview responsive />
                                    </div>
                                    <div className="recent-card-name">{c.name}</div>
                                    <div className="recent-card-meta">
                                        <span>{c.time}</span>
                                        <span className="mono recent-card-size">SVG · 18 KB</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="kebab-button"
                                        aria-label={`Open menu for ${c.name}`}
                                        onClick={(e) => onKebabClick(key, e)}
                                    >
                                        ⋯
                                    </button>
                                    {renderMenu(key, c.name)}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <ReRunModal
                open={reRunTarget !== null}
                chartName={reRunTarget?.name ?? ""}
                onClose={() => setReRunTarget(null)}
                onComplete={() => {
                    toast({
                        title: "Chart updated · new data applied",
                        variant: "success",
                    });
                }}
            />
        </div>
    );
};
