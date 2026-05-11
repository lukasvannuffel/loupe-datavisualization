"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { useAppState } from "@/app/providers";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { SEMANTIC_TAG_LABEL } from "@/lib/parser/inference.types";
import { inferColumnTypes } from "@/lib/parser/inferColumnTypes";
import { useFileParser } from "@/lib/parser/useFileParser";
import { PrivacyDiagram } from "./PrivacyDiagram";

const PLACEHOLDERS: readonly string[] = [
    "Compare 5-year survival between treatment arms…",
    "Show distribution of tumor sizes by stage…",
    "Plot hazard ratios across pre-specified subgroups…",
    "Compare biomarker concordance between two assays…",
];

const LOW_CONFIDENCE_THRESHOLD = 0.5;

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const Upload = (): JSX.Element => {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const tryAgainRef = useRef<HTMLButtonElement | null>(null);
    const { state, parse, reset } = useFileParser();
    const { setDataset, clearDataset, setMapping } = useAppState();

    const [dragOver, setDragOver] = useState<boolean>(false);
    const [phIndex, setPhIndex] = useState<number>(0);

    type UploadPhase = "empty" | "scanning" | "uploaded" | "error";
    const phaseOf = (status: typeof state.status): UploadPhase => {
        switch (status) {
            case "idle":
                return "empty";
            case "parsing":
                return "scanning";
            case "success":
                return "uploaded";
            case "error":
                return "error";
        }
    };
    const phase: UploadPhase = phaseOf(state.status);

    useEffect(() => {
        if (phase !== "empty") {
            return;
        }

        const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 3500);

        return () => clearInterval(t);
    }, [phase]);

    useEffect(() => {
        if (phase === "error") {
            tryAgainRef.current?.focus();
        }
    }, [phase]);

    const handleFile = (file: File | undefined): void => {
        if (file === undefined) {
            return;
        }

        void parse(file);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
    };

    const onContinue = (): void => {
        router.push("/upload/map");
    };

    const result = state.status === "success" ? state.result : null;
    const errorMessage = state.status === "error" ? state.error.message : null;
    const inferences = useMemo(
        () => (result !== null ? inferColumnTypes(result) : null),
        [result],
    );

    useEffect(() => {
        if (inferences === null) {
            return;
        }
        // Intent intentionally preserved across uploads: same-study workflow is the common case.
        setDataset(inferences);
        setMapping({});
    }, [inferences, setDataset, setMapping]);

    const onReplace = (): void => {
        reset();
        clearDataset();
        setMapping({});
    };

    return (
        <div className="upload-page page-enter">
            <div className="container">
                <div className="upload-head">
                    <div>
                        <Eyebrow>Step 1 · Bring your data</Eyebrow>
                        <h1 className="upload-title">Drop a file. Confirm what we found.</h1>
                    </div>
                    <div className="upload-head-meta muted">01 / 03 · UPLOAD</div>
                </div>

                <div className="upload-grid">
                    <div
                        className={
                            "dropzone " +
                            (dragOver || phase === "scanning" ? "is-active " : "") +
                            (phase === "uploaded" ? "is-uploaded " : "")
                        }
                        role="button"
                        tabIndex={phase === "empty" ? 0 : -1}
                        aria-label="Choose a CSV or Excel file"
                        aria-busy={phase === "scanning"}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => phase === "empty" && fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                            if (phase !== "empty") {
                                return;
                            }
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileInputRef.current?.click();
                            }
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx"
                            hidden
                            onChange={(e) => {
                                handleFile(e.target.files?.[0]);
                                e.target.value = "";
                            }}
                        />
                        <div className="dropzone-loupe" />
                        {phase !== "uploaded" && (
                            <div>
                                <p className="dropzone-prompt-serif">
                                    {phase === "scanning"
                                        ? "Reading on your device…"
                                        : "Drop a CSV or Excel file."}
                                </p>
                                <p className="dropzone-prompt-sub">
                                    {phase === "scanning"
                                        ? "Parsing rows locally — none will leave the page."
                                        : "Or click anywhere in this zone to choose a file."}
                                </p>
                                <div className="dropzone-formats">.CSV · .XLSX · UP TO 50 MB</div>
                                {phase === "empty" && (
                                    <div className="dropzone-rotator muted" key={phIndex}>
                                        {PLACEHOLDERS[phIndex]}
                                    </div>
                                )}
                            </div>
                        )}
                        {phase === "uploaded" && result !== null && (
                            <div className="dropzone-uploaded">
                                <div className="dropzone-uploaded-row">
                                    <svg width="24" height="24" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--ink)" strokeWidth="0.8" />
                                        <path d="M7.5 12.5 L11 16 L17 9" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
                                    </svg>
                                    <div>
                                        <div className="serif dropzone-uploaded-name">{result.fileName}</div>
                                        <div className="muted dropzone-uploaded-meta">
                                            <span className="mono">
                                                {result.rowCount.toLocaleString()} rows · {result.headers.length} columns · {formatBytes(result.sizeBytes)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="dropzone-uploaded-actions">
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onReplace();
                                            }}
                                        >
                                            Replace
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="privacy-diag">
                        <h4>Where things go.</h4>
                        <PrivacyDiagram active={phase !== "empty" && phase !== "error"} />
                        <div className="privacy-diag-foot">
                            <span>ROWS · LOCAL</span>
                            <span style={{ color: "var(--amber)" }}>SCHEMA · OUTBOUND</span>
                        </div>
                    </div>
                </div>

                {phase === "error" && errorMessage !== null && (
                    <div className="dropzone-error" role="alert">
                        <p className="dropzone-error-msg">{errorMessage}</p>
                        <button
                            ref={tryAgainRef}
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={onReplace}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {phase === "uploaded" && inferences !== null && inferences.length > 0 && (
                    <div className="col-preview">
                        <div className="col-preview-head">
                            <div className="col-preview-head-title">What we detected.</div>
                            <span className="muted mono">{inferences.length} columns</span>
                        </div>
                        <div className="col-preview-scroll">
                            <table className="col-preview-table">
                                <thead>
                                    <tr>
                                        <th>Column</th>
                                        <th>Type</th>
                                        <th>Confidence</th>
                                        <th>Sample</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inferences.map((c) => {
                                        const reasonsText = c.reasons.join("; ");
                                        const reasonsId = `col-reasons-${c.name}`;
                                        const needsReview = c.confidence < LOW_CONFIDENCE_THRESHOLD;
                                        const pct = Math.round(c.confidence * 100);

                                        return (
                                            <tr key={c.name} aria-describedby={reasonsId}>
                                                <td>{c.name}</td>
                                                <td className="col-type-cell" title={reasonsText}>
                                                    <span id={reasonsId} hidden>{reasonsText}</span>
                                                    <span className="type-badges">
                                                        <span className="type-badge">{c.primaryType}</span>
                                                        {c.semanticTag !== undefined && (
                                                            <span className="type-badge type-badge--accent">
                                                                {SEMANTIC_TAG_LABEL[c.semanticTag]}
                                                            </span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className={"mono" + (needsReview ? " col-confidence--review" : "")}>
                                                    {pct}%
                                                    {needsReview && <span className="col-review-tag">review</span>}
                                                </td>
                                                <td className="muted mono">{c.sampleValues.join(", ")}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {phase === "uploaded" && inferences !== null && inferences.length === 0 && (
                    <p className="muted col-preview-empty">No columns detected — check the file&apos;s header row.</p>
                )}

                {phase === "uploaded" && result !== null && (
                    <div className="upload-continue">
                        <span className="muted intent-meta-note">
                            Step 2 maps these columns to chart roles and asks what you found.
                        </span>
                        <button
                            type="button"
                            className="btn btn--primary btn--lg"
                            onClick={onContinue}
                        >
                            Continue to mapping <span className="arrow">→</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
