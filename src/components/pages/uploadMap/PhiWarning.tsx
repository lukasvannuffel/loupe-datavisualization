"use client";

import { useId, useState } from "react";

import type { PhiMatch } from "@/lib/ai/phi/detect";

import { PhiRenameModal } from "./PhiRenameModal";

type PhiWarningProps = {
    readonly matches: ReadonlyArray<PhiMatch>;
    readonly onRename: (oldName: string, newName: string) => void;
    readonly onSendAnyway: () => void;
    readonly onCancel: () => void;
};

export const PhiWarning = ({
    matches,
    onRename,
    onSendAnyway,
    onCancel,
}: PhiWarningProps): JSX.Element | null => {
    const titleId = useId();
    const [modalOpen, setModalOpen] = useState(false);
    const [sendStep, setSendStep] = useState<0 | 1>(0);

    if (matches.length === 0) {
        return null;
    }

    const onSaveRenames = (
        pairs: ReadonlyArray<{ readonly oldName: string; readonly newName: string }>,
    ): void => {
        for (const p of pairs) {
            onRename(p.oldName, p.newName);
        }
    };

    const onSendClick = (): void => {
        if (sendStep === 0) {
            setSendStep(1);

            return;
        }
        onSendAnyway();
        setSendStep(0);
    };

    return (
        <>
            <div aria-live="polite" className="phi-warning" role="alert">
                <div className="phi-warning__title" id={titleId}>
                    {matches.length} column name(s) look sensitive
                </div>
                <ul className="phi-warning__list">
                    {matches.map((m) => (
                        <li key={m.column}>
                            <strong>{m.column}</strong> — {m.reason}
                        </li>
                    ))}
                </ul>
                <div className="phi-warning__actions">
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => setModalOpen(true)}
                    >
                        Rename
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn--quiet btn--sm" onClick={onSendClick}>
                        Send anyway
                    </button>
                </div>
                {sendStep === 1 && (
                    <p aria-live="assertive" className="phi-warning__confirm">
                        Click again to confirm — your column names will be sent as-is.
                    </p>
                )}
            </div>
            <PhiRenameModal
                matches={matches}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={(pairs) => {
                    onSaveRenames(pairs);
                }}
            />
        </>
    );
};
