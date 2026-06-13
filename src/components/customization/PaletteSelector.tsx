"use client";

import { PALETTE_SWATCH_HEX } from "@/components/charts/d3/palettes";
import type { UserPalette } from "@/app/palettes/schemas";
import type { PaletteId, PaletteName } from "@/lib/chartSpec/types";

type PaletteSelectorProps = {
    readonly value: PaletteId;
    readonly onChange: (next: PaletteId) => void;
    readonly userPalettes?: readonly UserPalette[];
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

export const PaletteSelector = ({
    value,
    onChange,
    userPalettes,
}: PaletteSelectorProps): JSX.Element => (
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

        {userPalettes !== undefined && userPalettes.length > 0 ? (
            <>
                <div className="palette-section-label" role="separator">
                    MY PALETTES
                </div>
                {userPalettes.map((palette) => {
                    const isActive = value === palette.id;

                    return (
                        <button
                            key={palette.id}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            className={`palette-row${isActive ? " is-active" : ""}`}
                            onClick={() => {
                                onChange(palette.id);
                            }}
                        >
                            <div className="palette-swatches">
                                {palette.colors.map((color, index) => (
                                    <span key={`${palette.id}-${index}`} style={{ background: color }} />
                                ))}
                            </div>
                            <div className="palette-meta">
                                <span className="palette-name">{palette.name}</span>
                            </div>
                            {isActive ? <span className="palette-check">✓</span> : null}
                        </button>
                    );
                })}
            </>
        ) : null}
    </div>
);
