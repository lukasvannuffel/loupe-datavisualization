"use client";

import Link from "next/link";
import { useState } from "react";

import { PublicationKM } from "@/components/charts/PublicationKM";
import { Eyebrow } from "@/components/primitives/Eyebrow";

type FontOption = {
    id: string;
    label: string;
    cssVar: string;
};

const FONTS: readonly FontOption[] = [
    { id: "inter", label: "Inter", cssVar: "var(--font-inter), Inter, sans-serif" },
    { id: "ibm", label: "IBM Plex Sans", cssVar: '"IBM Plex Sans", Inter, sans-serif' },
    {
        id: "source-serif",
        label: "Source Serif",
        cssVar: "var(--font-source-serif), Georgia, serif",
    },
];

type Palette = {
    id: string;
    label: string;
    note: string;
    colors: readonly [string, string, string, string, string];
};

const PALETTES: readonly Palette[] = [
    {
        id: "nejm",
        label: "NEJM",
        note: "Print-safe · monochrome ink + accent",
        colors: ["#0E0E0E", "#6B6B66", "#9A9A93", "#0B2A4A", "#B5651D"],
    },
    {
        id: "lancet",
        label: "Lancet",
        note: "Editorial · paired blues",
        colors: ["#143C6E", "#3F77B0", "#7AA7D0", "#B5651D", "#0E0E0E"],
    },
    {
        id: "jama",
        label: "JAMA",
        note: "Clinical · cool palette",
        colors: ["#003F66", "#0072B2", "#56B4E9", "#D55E00", "#0E0E0E"],
    },
    {
        id: "nature",
        label: "Nature",
        note: "Vibrant · multi-hue",
        colors: ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7"],
    },
];

const STROKE_OPTIONS: readonly number[] = [1, 1.5, 2];
const POINT_SIZES: readonly number[] = [3, 4, 5];

type ProjectStyleProps = {
    projectId: string;
};

export const ProjectStyle = ({ projectId }: ProjectStyleProps): JSX.Element => {
    const [fontId, setFontId] = useState<string>("inter");
    const [scale, setScale] = useState<number>(1);
    const [paletteId, setPaletteId] = useState<string>("nejm");
    const [stroke, setStroke] = useState<number>(1.5);
    const [pointSize, setPointSize] = useState<number>(4);

    const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];
    const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];

    return (
        <div className="style-page page-enter">
            <div className="container">
                <header className="style-head">
                    <div>
                        <Link href="/dashboard" className="btn btn--quiet btn--sm style-back">
                            ← Dashboard
                        </Link>
                        <Eyebrow>Project · {projectId}</Eyebrow>
                        <h1 className="style-title">Shared style for this project.</h1>
                        <p className="style-sub muted">
                            Settings here apply to every chart in the project. Changes preview live below.
                            Persistence is mocked in this prototype.
                        </p>
                    </div>
                </header>

                <div className="style-grid">
                    <aside className="style-rail">
                        <section className="style-section">
                            <h4 className="style-section-label">Typography</h4>
                            <div className="custom-row">
                                <label>Font family</label>
                                <div className="errorbar-options">
                                    {FONTS.map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            className={
                                                "errorbar-option " +
                                                (fontId === f.id ? "is-active" : "")
                                            }
                                            onClick={() => setFontId(f.id)}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="custom-row">
                                <label>
                                    Font scale{" "}
                                    <span className="mono muted">×{scale.toFixed(2)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.85"
                                    max="1.15"
                                    step="0.01"
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                />
                            </div>
                        </section>

                        <section className="style-section">
                            <h4 className="style-section-label">Palette</h4>
                            <div className="palette-list">
                                {PALETTES.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={
                                            "palette-row " +
                                            (paletteId === p.id ? "is-active" : "")
                                        }
                                        onClick={() => setPaletteId(p.id)}
                                    >
                                        <div className="palette-swatches palette-swatches--five">
                                            {p.colors.map((c) => (
                                                <span key={c} style={{ background: c }} />
                                            ))}
                                        </div>
                                        <div className="palette-meta">
                                            <span className="palette-name">{p.label}</span>
                                            <span className="palette-note">{p.note}</span>
                                        </div>
                                        {paletteId === p.id && (
                                            <span className="palette-check">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="style-section">
                            <h4 className="style-section-label">Marks</h4>
                            <div className="custom-row">
                                <label>Axis stroke width</label>
                                <div className="errorbar-options">
                                    {STROKE_OPTIONS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={
                                                "errorbar-option " +
                                                (stroke === s ? "is-active" : "")
                                            }
                                            onClick={() => setStroke(s)}
                                        >
                                            {s.toFixed(1)}px
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="custom-row">
                                <label>Point size</label>
                                <div className="errorbar-options">
                                    {POINT_SIZES.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={
                                                "errorbar-option " +
                                                (pointSize === p ? "is-active" : "")
                                            }
                                            onClick={() => setPointSize(p)}
                                        >
                                            {p}px
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </aside>

                    <div
                        className="style-preview"
                        style={{
                            fontFamily: font.cssVar,
                            fontSize: `${15 * scale}px`,
                        }}
                    >
                        <div className="style-preview-card">
                            <Eyebrow>Live preview</Eyebrow>
                            <h3 className="style-preview-title">
                                Five-year overall survival by treatment arm
                            </h3>
                            <p className="muted style-preview-sub">
                                Style changes propagate to every chart in this project. The prototype renders
                                the preview locally only.
                            </p>
                            <div className="style-preview-frame">
                                <PublicationKM
                                    animated={false}
                                    colorA={palette.colors[0]}
                                    colorB={palette.colors[3]}
                                    strokeWeight={stroke}
                                    showAtRisk={false}
                                />
                            </div>
                            <div className="style-preview-meta muted">
                                Font · {font.label} · scale ×{scale.toFixed(2)} · palette {palette.label} ·
                                stroke {stroke.toFixed(1)}px · point {pointSize}px
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
