"use client";

import { useState } from "react";

import {
    createPalette,
    deletePalette,
} from "@/app/palettes/actions";
import type { UserPalette } from "@/app/palettes/schemas";
import {
    hexColorSchema,
    parseHexInput,
    parseValidHexColors,
} from "@/app/palettes/schemas";

type PaletteManagerProps = {
    readonly initialPalettes: readonly UserPalette[];
};

export const PaletteManager = ({
    initialPalettes,
}: PaletteManagerProps): JSX.Element => {
    const [palettes, setPalettes] = useState<readonly UserPalette[]>(() => [...initialPalettes]);
    const [formOpen, setFormOpen] = useState(false);
    const [name, setName] = useState("");
    const [hexInput, setHexInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const previewTokens = parseHexInput(hexInput);
    const validColors = parseValidHexColors(hexInput);
    const canSave = name.trim().length > 0 && validColors.length > 0 && saving === false;

    const closeForm = (): void => {
        setFormOpen(false);
        setError(null);
    };

    const onSave = async (): Promise<void> => {
        if (!canSave) {
            return;
        }

        setSaving(true);
        setError(null);

        const result = await createPalette({
            name: name.trim(),
            colors: validColors,
        });

        if (!result.success) {
            setError(result.error);
            setSaving(false);

            return;
        }

        setPalettes((current) => [result.palette, ...current]);
        setName("");
        setHexInput("");
        setSaving(false);
        setFormOpen(false);
    };

    const onDelete = async (id: string, paletteName: string): Promise<void> => {
        if (!window.confirm(`Delete palette "${paletteName}"?`)) {
            return;
        }

        const previous = palettes;
        setPalettes((items) => items.filter((palette) => palette.id !== id));
        setError(null);

        const result = await deletePalette(id);
        if (!result.success) {
            setPalettes(previous);
            setError(result.error);
        }
    };

    return (
        <section className="palette-bar-wrap">
            <div className="palette-bar">
                <span className="actions-panel__label palette-bar__label">COLOUR PALETTES</span>
                <div className="palette-bar__pills">
                    {palettes.length === 0 ? (
                        <p className="palette-bar__empty muted">
                            No palettes yet — create one to reuse colours across charts.
                        </p>
                    ) : (
                        palettes.map((palette) => (
                            <div key={palette.id} className="palette-pill">
                                <span className="palette-pill__name">{palette.name}</span>
                                <div className="palette-pill__swatches">
                                    {palette.colors.slice(0, 4).map((color, index) => (
                                        <span
                                            key={`${palette.id}-${index}`}
                                            className="palette-pill__swatch"
                                            style={{ background: color }}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="palette-pill__delete"
                                    onClick={() => {
                                        void onDelete(palette.id, palette.name);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
                <button
                    type="button"
                    className="btn btn--quiet btn--sm palette-bar__new"
                    onClick={() => {
                        setFormOpen((open) => !open);
                    }}
                >
                    + New palette
                </button>
            </div>

            <div className={`palette-bar__form${formOpen ? " is-open" : ""}`}>
                <div className="palette-bar__form-inner">
                    <button
                        type="button"
                        className="palette-bar__close"
                        aria-label="Close palette form"
                        onClick={closeForm}
                    >
                        ×
                    </button>
                    <form
                        className="palette-bar__fields"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void onSave();
                        }}
                    >
                        <label className="customization-field">
                            <span className="customization-field__label">Name</span>
                            <input
                                className="customization-field__input"
                                value={name}
                                onChange={(event) => {
                                    setName(event.currentTarget.value);
                                }}
                                placeholder="Arteveldehogeschool"
                            />
                        </label>
                        <label className="customization-field">
                            <span className="customization-field__label">Hex colours</span>
                            <input
                                className="customization-field__input"
                                value={hexInput}
                                onChange={(event) => {
                                    setHexInput(event.currentTarget.value);
                                }}
                                placeholder="#F37021, #7DBB42, #009FE3, #000000"
                            />
                        </label>
                        {previewTokens.length > 0 ? (
                            <div className="palette-pill__swatches palette-bar__preview">
                                {previewTokens.map((token, index) => {
                                    const isValid = hexColorSchema.safeParse(token).success;

                                    return (
                                        <span
                                            key={`${token}-${index}`}
                                            className={`palette-pill__swatch${isValid ? "" : " is-invalid"}`}
                                            style={isValid ? { background: token } : undefined}
                                        />
                                    );
                                })}
                            </div>
                        ) : null}
                        {error !== null ? (
                            <p className="palette-bar__error" role="alert">
                                {error}
                            </p>
                        ) : null}
                        <button type="submit" className="btn btn--secondary" disabled={!canSave}>
                            Save palette
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};
