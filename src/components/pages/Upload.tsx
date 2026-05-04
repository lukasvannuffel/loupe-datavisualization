"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { PrivacyDiagram } from "./PrivacyDiagram";
import {
    SAMPLE_COLUMNS,
    SAMPLE_FILE_NAME,
    SAMPLE_FILE_SIZE,
    SAMPLE_ROW_COUNT,
} from "./sampleData";

type UploadPhase = "empty" | "scanning" | "uploaded";

const PLACEHOLDERS: readonly string[] = [
    "Compare 5-year survival between treatment arms…",
    "Show distribution of tumor sizes by stage…",
    "Plot hazard ratios across pre-specified subgroups…",
    "Compare biomarker concordance between two assays…",
];

export const Upload = (): JSX.Element => {
    const router = useRouter();

    const [phase, setPhase] = useState<UploadPhase>("empty");
    const [dragOver, setDragOver] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string>(SAMPLE_FILE_NAME);
    const [phIndex, setPhIndex] = useState<number>(0);

    useEffect(() => {
        if (phase !== "empty") {
            return;
        }

        const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 3500);

        return () => clearInterval(t);
    }, [phase]);

    const simulateUpload = (): void => {
        setPhase("scanning");
        setTimeout(() => setPhase("uploaded"), 1400);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.[0]) {
            setFileName(e.dataTransfer.files[0].name);
        }

        simulateUpload();
    };

    const onContinue = (): void => {
        router.push("/upload/map");
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
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => phase === "empty" && simulateUpload()}
                    >
                        <div className="dropzone-loupe" />
                        {phase !== "uploaded" && (
                            <div>
                                <p className="dropzone-prompt-serif">
                                    {phase === "scanning" ? "Reading on your device…" : "Drop a CSV or Excel file."}
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
                        {phase === "uploaded" && (
                            <div className="dropzone-uploaded">
                                <div className="dropzone-uploaded-row">
                                    <svg width="24" height="24" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--ink)" strokeWidth="0.8" />
                                        <path d="M7.5 12.5 L11 16 L17 9" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
                                    </svg>
                                    <div>
                                        <div className="serif dropzone-uploaded-name">{fileName}</div>
                                        <div className="muted dropzone-uploaded-meta">
                                            <span className="mono">
                                                {SAMPLE_ROW_COUNT.toLocaleString()} rows · {SAMPLE_COLUMNS.length} columns · {SAMPLE_FILE_SIZE}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="dropzone-uploaded-actions">
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPhase("empty");
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
                        <PrivacyDiagram active={phase !== "empty"} />
                        <div className="privacy-diag-foot">
                            <span>ROWS · LOCAL</span>
                            <span style={{ color: "var(--amber)" }}>SCHEMA · OUTBOUND</span>
                        </div>
                    </div>
                </div>

                {phase === "uploaded" && (
                    <>
                        <div className="col-preview">
                            <div className="col-preview-head">
                                <div>
                                    <Eyebrow>Quick look · column types</Eyebrow>
                                    <div className="serif col-preview-head-title">
                                        First five rows · types auto-detected
                                    </div>
                                </div>
                                <span className="muted intent-meta-note">
                                    You&apos;ll map these to chart roles in the next step.
                                </span>
                            </div>
                            <div className="col-preview-scroll">
                                <table className="col-preview-table">
                                    <thead>
                                        <tr>
                                            {SAMPLE_COLUMNS.map((c) => (
                                                <th key={c.name}>
                                                    {c.name}
                                                    <span
                                                        className={
                                                            "col-type tt-" +
                                                            (c.type === "tt-event" ? "event" : "")
                                                        }
                                                    >
                                                        {c.type === "tt-event" ? "event" : c.type}
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[0, 1, 2, 3, 4].map((row) => (
                                            <tr key={row}>
                                                {SAMPLE_COLUMNS.map((c) => (
                                                    <td key={c.name}>{c.samples[row]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

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
                    </>
                )}
            </div>
        </div>
    );
};
