"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import type { Mapping } from "@/app/providers";
import { useAppState } from "@/app/providers";
import { MappingResetDialog } from "@/components/pages/upload/MappingResetDialog";
import { WorksheetSelector } from "@/components/pages/upload/WorksheetSelector";
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

const SHEET_PICKER_HEADING_ID = "upload-sheet-picker-heading";

const hasMappingAssignments = (mapping: Mapping): boolean => {
    return Object.values(mapping).some((column) => column !== undefined && column !== "");
};

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
    const lastParsedSheetRef = useRef<string | undefined>(undefined);

    const {
        canReturnToSheetPicker,
        parse,
        parseSheet,
        reset,
        returnToSheetSelection,
        state,
    } = useFileParser();

    const { mapping, setDataset, clearDataset, setMapping } = useAppState();

    const [dragOver, setDragOver] = useState<boolean>(false);
    const [phIndex, setPhIndex] = useState<number>(0);
    const [selectedSheet, setSelectedSheet] = useState<string>("");
    const [mappingResetOpen, setMappingResetOpen] = useState<boolean>(false);
    const [pendingSheetName, setPendingSheetName] = useState<string | null>(null);

    type UploadPhase = "choose_sheet" | "empty" | "error" | "scanning" | "uploaded";
    const phaseOf = (status: typeof state.status): UploadPhase => {
        switch (status) {
            case "idle":
                return "empty";
            case "parsing":
                return "scanning";
            case "needs_sheet_selection":
                return "choose_sheet";
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

        const timerId = window.setInterval(() => setPhIndex((index) => (index + 1) % PLACEHOLDERS.length), 3500);

        return () => window.clearInterval(timerId);
    }, [phase]);

    useEffect(() => {
        if (phase === "error") {
            tryAgainRef.current?.focus();
        }
    }, [phase]);

    useEffect(() => {
        if (state.status !== "success") {
            return;
        }

        const sheet = state.result.sheetName;

        if (sheet !== undefined) {
            lastParsedSheetRef.current = sheet;
        }
    }, [state]);

    const sheetSelectionSyncKey =
        state.status === "needs_sheet_selection"
            ? state.sheets.map((sheetMeta) => `${sheetMeta.name}:${sheetMeta.rowCount}`).join("|")
            : "";

    /* eslint-disable react-hooks/exhaustive-deps -- `sheetSelectionSyncKey` encodes `state.sheets` */
    useEffect(() => {
        if (state.status !== "needs_sheet_selection") {
            return;
        }

        const names = state.sheets.map((sheetMeta) => sheetMeta.name);
        const preferred = lastParsedSheetRef.current;
        const pick =
            preferred !== undefined && names.includes(preferred) ? preferred : (names[0] ?? "");

        setSelectedSheet(pick);
    }, [state.status, sheetSelectionSyncKey]);
    /* eslint-enable react-hooks/exhaustive-deps */

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

    const onContinueToMap = (): void => {
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

        setDataset(inferences);
        setMapping({});
    }, [inferences, setDataset, setMapping]);

    const onReplace = (): void => {
        reset();
        clearDataset();
        setMapping({});
    };

    const requestSheetChange = (next: string): void => {
        if (next === selectedSheet) {
            return;
        }

        if (!hasMappingAssignments(mapping)) {
            setSelectedSheet(next);

            return;
        }

        setPendingSheetName(next);
        setMappingResetOpen(true);
    };

    const onConfirmMappingReset = (): void => {
        setMapping({});

        if (pendingSheetName !== null) {
            setSelectedSheet(pendingSheetName);
        }

        setPendingSheetName(null);
        setMappingResetOpen(false);
    };

    const onCancelMappingReset = (): void => {
        setPendingSheetName(null);
        setMappingResetOpen(false);
    };

    const onContinueSheet = (): void => {
        if (selectedSheet === "") {
            return;
        }

        void parseSheet(selectedSheet);
    };

    const dropzonePromptTitle = (): string => {
        switch (phase) {
            case "scanning":
                return "Reading on your device…";
            case "choose_sheet":
                return "Choose a worksheet.";
            default:
                return "Drop a CSV or Excel file.";
        }
    };

    const dropzonePromptSub = (): string => {
        switch (phase) {
            case "scanning":
                return "Parsing rows locally — none will leave the page.";
            case "choose_sheet":
                return "Pick a sheet and continue — nothing leaves your device.";
            default:
                return "Or click anywhere in this zone to choose a file.";
        }
    };

    const sheetPickerActive = phase === "choose_sheet" && state.status === "needs_sheet_selection";

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
                            (phase === "uploaded" ? "is-uploaded " : "") +
                            (phase === "choose_sheet" ? "is-active " : "")
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
                        onClick={() => {
                            if (phase === "empty") {
                                fileInputRef.current?.click();
                            }
                        }}
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
                                <p className="dropzone-prompt-serif">{dropzonePromptTitle()}</p>
                                <p className="dropzone-prompt-sub">{dropzonePromptSub()}</p>
                                <div className="dropzone-formats">.CSV · .XLSX · UP TO 50 MB</div>
                                {sheetPickerActive && (
                                    <div
                                        className="sheet-picker-shell"
                                        onClick={(event) => event.stopPropagation()}
                                        onKeyDown={(event) => event.stopPropagation()}
                                    >
                                        <h4 className="sheet-picker-title" id={SHEET_PICKER_HEADING_ID}>
                                            Worksheet
                                        </h4>
                                        <WorksheetSelector
                                            ariaLabelledBy={SHEET_PICKER_HEADING_ID}
                                            sheets={state.sheets}
                                            value={selectedSheet}
                                            onChange={requestSheetChange}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn--primary btn--lg sheet-continue"
                                            aria-label="Continue with selected worksheet"
                                            disabled={selectedSheet === ""}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onContinueSheet();
                                            }}
                                        >
                                            Continue
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm sheet-repick-file"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            Choose a different file
                                        </button>
                                    </div>
                                )}
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
                                                {result.rowCount.toLocaleString()} rows · {result.headers.length} columns ·{" "}
                                                {formatBytes(result.sizeBytes)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="dropzone-uploaded-actions">
                                        {canReturnToSheetPicker && (
                                            <button
                                                type="button"
                                                className="btn btn--ghost btn--sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void returnToSheetSelection();
                                                }}
                                            >
                                                Change worksheet
                                            </button>
                                        )}
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
                        <button type="button" className="btn btn--primary btn--lg" onClick={onContinueToMap}>
                            Continue to mapping <span className="arrow">→</span>
                        </button>
                    </div>
                )}
            </div>

            <MappingResetDialog
                open={mappingResetOpen}
                onCancel={onCancelMappingReset}
                onConfirm={onConfirmMappingReset}
            />
        </div>
    );
};
