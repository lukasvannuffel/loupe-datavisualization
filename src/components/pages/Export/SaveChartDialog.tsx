"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Dialog } from "@/components/ui/Dialog";

const NAME_MAX = 100;

type SaveChartDialogProps = {
    readonly isOpen: boolean;
    readonly defaultName: string;
    readonly onConfirm: (name: string) => void;
    readonly onCancel: () => void;
};

const validateName = (trimmed: string): string | null => {
    if (trimmed.length === 0) return "Name cannot be empty.";
    if (/[/\\:]/.test(trimmed)) return "Name cannot contain /, \\, or :.";
    if (trimmed.length > NAME_MAX) return "Name must be 100 characters or fewer.";

    return null;
};

export const SaveChartDialog = ({
    isOpen,
    defaultName,
    onConfirm,
    onCancel,
}: SaveChartDialogProps): JSX.Element => {
    const [name, setName] = useState(defaultName);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setName(defaultName);
        setError(null);
    }, [isOpen]);

    const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const trimmed = name.trim();
        const nextError = validateName(trimmed);
        if (nextError !== null) {
            setError(nextError);
            return;
        }
        onConfirm(trimmed);
    };

    return (
        <Dialog open={isOpen} onClose={onCancel} title="Save chart">
            <form onSubmit={onSubmit}>
                <header className="rerun-head">
                    <h3>Save chart</h3>
                    <p className="muted">Name this chart for your dashboard.</p>
                </header>
                <div className="custom-row">
                    <label htmlFor="save-chart-name">Chart name</label>
                    <input
                        id="save-chart-name"
                        className="custom-input"
                        value={name}
                        maxLength={NAME_MAX}
                        autoFocus
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(null);
                        }}
                    />
                    {error !== null ? (
                        <p className="muted small" role="alert">{error}</p>
                    ) : null}
                </div>
                <div className="rerun-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="btn btn--primary btn--sm">Save</button>
                </div>
            </form>
        </Dialog>
    );
};
