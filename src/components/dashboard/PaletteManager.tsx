"use client";

import { useState } from "react";

import {
    createPalette,
    deletePalette,
    renamePalette,
} from "@/app/palettes/actions";
import type { UserPalette } from "@/app/palettes/schemas";
import {
    hexColorSchema,
    parseHexInput,
    parseValidHexColors,
} from "@/app/palettes/schemas";
import { CustomSection } from "@/components/pages/CustomSection";

type PaletteManagerProps = {
    readonly initialPalettes: readonly UserPalette[];
};

export const PaletteManager = ({
    initialPalettes,
}: PaletteManagerProps): JSX.Element => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [palettes, setPalettes] = useState<readonly UserPalette[]>(() => [...initialPalettes]);
    const [name, setName] = useState("");
    const [hexInput, setHexInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const previewTokens = parseHexInput(hexInput);
    const validColors = parseValidHexColors(hexInput);
    const canSave = name.trim().length > 0 && validColors.length > 0 && saving === false;

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
    };

    const onRename = async (id: string, nextName: string): Promise<void> => {
        const trimmed = nextName.trim();
        const current = palettes.find((palette) => palette.id === id);
        if (current === undefined || trimmed.length === 0 || trimmed === current.name) {
            return;
        }

        const previous = palettes;
        setPalettes((items) =>
            items.map((palette) =>
                palette.id === id ? { ...palette, name: trimmed } : palette,
            ),
        );

        const result = await renamePalette({ id, name: trimmed });
        if (!result.success) {
            setPalettes(previous);
            setError(result.error);

            return;
        }

        setPalettes((items) =>
            items.map((palette) => (palette.id === id ? result.palette : palette)),
        );
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
        <section className="palette-manager">
            <CustomSection
                id="colour-palettes"
                label="Colour palettes"
                open={openSection}
                setOpen={setOpenSection}
            >
                {palettes.length === 0 ? (
                    <p className="palette-manager__empty muted">No saved palettes yet.</p>
                ) : (
                    <ul className="palette-manager__list">
                        {palettes.map((palette) => (
                            <li key={palette.id} className="palette-manager__item">
                                <input
                                    className="palette-manager__name"
                                    defaultValue={palette.name}
                                    aria-label={`Rename ${palette.name}`}
                                    onBlur={(event) => {
                                        void onRename(palette.id, event.currentTarget.value);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.currentTarget.blur();
                                        }
                                    }}
                                />
                                <div className="palette-swatches palette-swatches--five">
                                    {palette.colors.map((color) => (
                                        <span key={color} style={{ background: color }} />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="palette-manager__delete"
                                    onClick={() => {
                                        void onDelete(palette.id, palette.name);
                                    }}
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <form
                    className="palette-manager__form"
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
                        <div className="palette-swatches palette-swatches--five palette-manager__preview">
                            {previewTokens.map((token, index) => {
                                const isValid = hexColorSchema.safeParse(token).success;

                                return (
                                    <span
                                        key={`${token}-${index}`}
                                        className={isValid ? undefined : "is-invalid"}
                                        style={isValid ? { background: token } : undefined}
                                    />
                                );
                            })}
                        </div>
                    ) : null}
                    {error !== null ? (
                        <p className="palette-manager__error" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <button type="submit" className="btn btn--secondary" disabled={!canSave}>
                        Save palette
                    </button>
                </form>
            </CustomSection>
        </section>
    );
};
