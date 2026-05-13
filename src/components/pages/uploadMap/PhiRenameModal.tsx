"use client";

import { useEffect, useId, useState } from "react";

import type { PhiMatch } from "@/lib/ai/phi/detect";

type PhiRenameModalProps = {
    readonly matches: ReadonlyArray<PhiMatch>;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSave: (nextByOld: ReadonlyArray<{ readonly oldName: string; readonly newName: string }>) => void;
};

export const PhiRenameModal = ({
    matches,
    open,
    onClose,
    onSave,
}: PhiRenameModalProps): JSX.Element | null => {
    const titleId = useId();
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) {
            return;
        }

        const next: Record<string, string> = {};
        for (const m of matches) {
            next[m.column] = m.column;
        }
        setDrafts(next);
    }, [open, matches]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const prev = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        document.body.classList.add("is-locked");
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
            prev?.focus?.();
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    const save = (): void => {
        const pairs: { oldName: string; newName: string }[] = [];
        for (const m of matches) {
            const nextName = drafts[m.column]?.trim() ?? m.column;
            if (nextName !== m.column) {
                pairs.push({ newName: nextName, oldName: m.column });
            }
        }
        onSave(pairs);
        onClose();
    };

    return (
        <div className="phi-modal-scrim" onClick={onClose}>
            <div
                className="phi-modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="phi-modal-title" id={titleId}>
                    Rename sensitive columns
                </h3>
                {matches.map((m, index) => (
                    <label key={m.column} className="phi-modal-field">
                        <span>{m.column}</span>
                        <input
                            autoFocus={index === 0}
                            type="text"
                            value={drafts[m.column] ?? ""}
                            onChange={(e) =>
                                setDrafts((d) => ({ ...d, [m.column]: e.target.value }))
                            }
                        />
                    </label>
                ))}
                <div className="phi-modal-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                        Close
                    </button>
                    <button type="button" className="btn btn--primary btn--sm" onClick={save}>
                        Save names
                    </button>
                </div>
            </div>
        </div>
    );
};
