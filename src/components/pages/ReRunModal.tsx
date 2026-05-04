"use client";

import { useEffect, useState } from "react";

import { Eyebrow } from "@/components/primitives/Eyebrow";

type ReRunStep = 1 | 2 | 3;

type ColumnDiff = {
    saved: string;
    type: string;
    matched: string | null;
    confidence: "exact" | "fuzzy" | "missing";
    closest?: string;
};

const SAMPLE_DIFF: readonly ColumnDiff[] = [
    {
        saved: "treatment_arm",
        type: "categorical",
        matched: "treatment_arm",
        confidence: "exact",
    },
    {
        saved: "OS_time",
        type: "numeric",
        matched: null,
        confidence: "missing",
        closest: "os_time_months",
    },
    {
        saved: "event_observed",
        type: "tt-event",
        matched: "event_observed",
        confidence: "exact",
    },
    {
        saved: "stage",
        type: "categorical",
        matched: "stage",
        confidence: "exact",
    },
];

type ReRunModalProps = {
    open: boolean;
    chartName: string;
    onClose: () => void;
    onComplete: () => void;
};

export const ReRunModal = ({
    open,
    chartName,
    onClose,
    onComplete,
}: ReRunModalProps): JSX.Element | null => {
    const [step, setStep] = useState<ReRunStep>(1);
    const [fileName, setFileName] = useState<string>("");
    const [acceptFuzzy, setAcceptFuzzy] = useState<boolean>(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);
        document.body.classList.add("is-locked");

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) {
            setStep(1);
            setFileName("");
            setAcceptFuzzy(false);
        }
    }, [open]);

    if (!open) {
        return null;
    }

    const onUploadStub = (): void => {
        setFileName("trial-cohort-2026-04.csv");
        setTimeout(() => setStep(2), 800);
    };

    const onAcceptFuzzy = (): void => {
        setAcceptFuzzy(true);
    };

    const onContinue = (): void => {
        setStep(3);
    };

    const onConfirm = (): void => {
        onComplete();
        onClose();
    };

    return (
        <div className="rerun-scrim" onClick={onClose}>
            <div
                className="rerun-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Re-run chart with new data"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="rerun-head">
                    <div>
                        <Eyebrow>Re-run · {step} / 3</Eyebrow>
                        <h3>{chartName}</h3>
                        <p className="muted">
                            Drop a fresh file. Loupe re-uses the saved chart configuration and column
                            mapping; mismatches surface here before any chart updates.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="rerun-close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="rerun-stepper">
                    {[1, 2, 3].map((n) => (
                        <span
                            key={n}
                            className={
                                "rerun-step " +
                                (step === n ? "is-active" : step > n ? "is-done" : "")
                            }
                        >
                            {n}.{" "}
                            {n === 1
                                ? "Upload"
                                : n === 2
                                    ? "Match columns"
                                    : "Confirm"}
                        </span>
                    ))}
                </div>

                {step === 1 && (
                    <div className="rerun-body">
                        <div className="rerun-drop" onClick={onUploadStub}>
                            <div className="dropzone-loupe" />
                            <p className="dropzone-prompt-serif">
                                {fileName ? "Reading on your device…" : "Drop the new CSV or Excel file."}
                            </p>
                            <p className="dropzone-prompt-sub">
                                {fileName ? fileName : "Click anywhere in this zone to choose a file."}
                            </p>
                            <div className="dropzone-formats">.CSV · .XLSX · UP TO 50 MB</div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="rerun-body">
                        <div className="rerun-diff">
                            {SAMPLE_DIFF.map((d) => {
                                const isMissing = d.confidence === "missing";

                                return (
                                    <div
                                        key={d.saved}
                                        className={
                                            "rerun-diff-row " +
                                            (isMissing && !acceptFuzzy ? "is-missing" : "")
                                        }
                                    >
                                        <div className="rerun-diff-left">
                                            <span className="mono">{d.saved}</span>
                                            <span className="muted rerun-diff-type">{d.type}</span>
                                        </div>
                                        <div className="rerun-diff-arrow muted" aria-hidden="true">
                                            →
                                        </div>
                                        <div className="rerun-diff-right">
                                            {d.matched && (
                                                <span className="mono">{d.matched}</span>
                                            )}
                                            {!d.matched && !acceptFuzzy && d.closest && (
                                                <span className="rerun-diff-warn">
                                                    not found · closest:{" "}
                                                    <span className="mono">{d.closest}</span>
                                                </span>
                                            )}
                                            {!d.matched && acceptFuzzy && d.closest && (
                                                <span className="mono">{d.closest}</span>
                                            )}
                                            <span
                                                className={
                                                    "rerun-diff-tag " +
                                                    (d.confidence === "exact"
                                                        ? "is-ok"
                                                        : acceptFuzzy
                                                            ? "is-fuzzy"
                                                            : "is-warn")
                                                }
                                            >
                                                {d.confidence === "exact"
                                                    ? "exact"
                                                    : acceptFuzzy
                                                        ? "remapped"
                                                        : "missing"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="rerun-actions">
                            {!acceptFuzzy && (
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={onAcceptFuzzy}
                                >
                                    Accept closest match
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={onContinue}
                                disabled={!acceptFuzzy}
                            >
                                Continue <span className="arrow">→</span>
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="rerun-body">
                        <div className="rerun-confirm">
                            <h4 className="serif">Replace existing chart?</h4>
                            <p className="muted">
                                The new file maps cleanly to the saved configuration. Replacing keeps the
                                title, palette, axis labels, annotations, and figure number — only the data
                                refreshes.
                            </p>
                            <ul className="rerun-confirm-list">
                                <li>Title · palette · axes preserved</li>
                                <li>Annotations preserved</li>
                                <li>Reproducibility receipt re-stamped</li>
                            </ul>
                        </div>
                        <div className="rerun-actions">
                            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={onConfirm}
                            >
                                Replace
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
