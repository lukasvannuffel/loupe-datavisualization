"use client";

import { PALETTE_SWATCH_HEX } from "@/components/charts/d3/palettes";
import type { PaletteName } from "@/lib/chartSpec/types";

type PaletteSelectorProps = {
    readonly value: PaletteName;
    readonly onChange: (next: PaletteName) => void;
};

type PaletteOption = {
    readonly name: PaletteName;
    readonly label: string;
    readonly tag: string;
};

const OPTIONS: readonly PaletteOption[] = [
    {
        name: "monochrome",
        label: "Monochrome",
        tag: "DEFAULT · PRINT-SAFE",
    },
    {
        name: "editorial",
        label: "Editorial",
        tag: "INK + GRAY",
    },
    {
        name: "okabe-ito",
        label: "Okabe–Ito",
        tag: "COLORBLIND-SAFE",
    },
    {
        name: "wong",
        label: "Wong",
        tag: "COLORBLIND-SAFE",
    },
    {
        name: "ibm-design",
        label: "IBM Design",
        tag: "COLORBLIND-SAFE",
    },
    {
        name: "tol-vibrant",
        label: "Tol Vibrant",
        tag: "COLORBLIND-SAFE",
    },
    {
        name: "deuteranopia-tuned",
        label: "Deuteranopia-tuned",
        tag: "BLUE + AMBER",
    },
];

export const PaletteSelector = ({ value, onChange }: PaletteSelectorProps): JSX.Element => (
    <div className="palette-list" role="listbox" aria-label="Chart palette">
        {OPTIONS.map((option) => {
            const isActive = value === option.name;
            const swatchColors = PALETTE_SWATCH_HEX[option.name];

            return (
                <button
                    key={option.name}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`palette-row${isActive ? " is-active" : ""}`}
                    onClick={() => {
                        onChange(option.name);
                    }}
                >
                    <div className="palette-swatches">
                        <span style={{ background: swatchColors[0] }} />
                        <span
                            style={{
                                background: swatchColors[1],
                                ...(option.name === "monochrome"
                                    ? {
                                          backgroundImage:
                                              "repeating-linear-gradient(90deg, " +
                                              swatchColors[1] +
                                              " 0 3px, transparent 3px 5px)",
                                      }
                                    : {}),
                            }}
                        />
                    </div>
                    <div className="palette-meta">
                        <span className="palette-name">{option.label}</span>
                        <span className="palette-note">{option.tag}</span>
                    </div>
                    {isActive ? <span className="palette-check">✓</span> : null}
                </button>
            );
        })}
    </div>
);
