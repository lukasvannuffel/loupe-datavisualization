"use client";

import type { PaletteName } from "@/lib/chartSpec/types";

type PaletteSelectorProps = {
    readonly value: PaletteName;
    readonly onChange: (next: PaletteName) => void;
};

type PaletteOption = {
    readonly name: PaletteName;
    readonly label: string;
    readonly tag: string;
    readonly swatchColors: readonly [string, string];
};

const OPTIONS: readonly PaletteOption[] = [
    {
        name: "editorial",
        label: "Editorial",
        tag: "DEFAULT · INK + GRAY",
        swatchColors: ["#0e0e0e", "#7a7a7a"],
    },
    {
        name: "okabe-ito",
        label: "Okabe–Ito",
        tag: "COLORBLIND-SAFE",
        swatchColors: ["#0072b2", "#e69f00"],
    },
    {
        name: "wong",
        label: "Wong",
        tag: "COLORBLIND-SAFE",
        swatchColors: ["#009e73", "#e69f00"],
    },
    {
        name: "ibm-design",
        label: "IBM Design",
        tag: "COLORBLIND-SAFE",
        swatchColors: ["#648fff", "#dc267f"],
    },
    {
        name: "tol-vibrant",
        label: "Tol Vibrant",
        tag: "COLORBLIND-SAFE",
        swatchColors: ["#0077bb", "#ee7733"],
    },
    {
        name: "deuteranopia-tuned",
        label: "Deuteranopia-tuned",
        tag: "BLUE + AMBER",
        swatchColors: ["#005f73", "#ee9b00"],
    },
    {
        name: "monochrome",
        label: "Monochrome",
        tag: "PRINT-SAFE",
        swatchColors: ["#000000", "#808080"],
    },
];

export const PaletteSelector = ({ value, onChange }: PaletteSelectorProps): JSX.Element => (
    <div className="palette-list" role="listbox" aria-label="Chart palette">
        {OPTIONS.map((option) => {
            const isActive = value === option.name;

            return (
                <button
                    key={option.name}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={"palette-row " + (isActive ? "is-active" : "")}
                    onClick={() => {
                        onChange(option.name);
                    }}
                >
                    <div className="palette-swatches">
                        <span style={{ background: option.swatchColors[0] }} />
                        <span
                            style={{
                                background: option.swatchColors[1],
                                ...(option.name === "monochrome"
                                    ? {
                                          backgroundImage:
                                              "repeating-linear-gradient(90deg, " +
                                              option.swatchColors[1] +
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
