"use client";

import { useCallback, useEffect, useState } from "react";

import { RingLoader } from "@/components/primitives/RingLoader";
import {
    composeReceipt,
    type Receipt as ComposedReceipt,
    type ReceiptInput,
} from "@/lib/receipt/composeReceipt";
import { copyToClipboard } from "@/lib/receipt/copyToClipboard";

type ReproducibilityReceiptPanelProps = {
    readonly input: ReceiptInput | null;
};

const downloadTextFile = (filename: string, content: string, mime: string): void => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

export const ReproducibilityReceiptPanel = ({
    input,
}: ReproducibilityReceiptPanelProps): JSX.Element | null => {
    const [receipt, setReceipt] = useState<ComposedReceipt | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (input === null) {
            setReceipt(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        void composeReceipt(input)
            .then((next) => {
                if (!cancelled) {
                    setReceipt(next);
                }
            })
            .catch((cause: unknown) => {
                if (!cancelled) {
                    setReceipt(null);
                    setError(cause instanceof Error ? cause.message : "Receipt could not be generated.");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [input]);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = window.setTimeout(() => {
            setCopied(false);
        }, 2000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [copied]);

    const onCopy = useCallback(async (): Promise<void> => {
        if (receipt === null) {
            return;
        }

        setError(null);

        try {
            await copyToClipboard(receipt.markdown);
            setCopied(true);
        } catch (cause: unknown) {
            setCopied(false);
            setError(cause instanceof Error ? cause.message : "Clipboard copy failed.");
        }
    }, [receipt]);

    const onDownloadTxt = useCallback((): void => {
        if (receipt === null) {
            return;
        }

        downloadTextFile("loupe-receipt.txt", receipt.plainText, "text/plain;charset=utf-8");
    }, [receipt]);

    const onDownloadMd = useCallback((): void => {
        if (receipt === null) {
            return;
        }

        downloadTextFile("loupe-receipt.md", receipt.markdown, "text/markdown;charset=utf-8");
    }, [receipt]);

    if (input === null) {
        return null;
    }

    const disabled = loading || receipt === null;

    return (
        <section className="export-receipt" aria-labelledby="reproducibility-receipt-heading">
            <h4 id="reproducibility-receipt-heading">Reproducibility receipt</h4>
            <p>
                Paste into supplementary materials. Records analytical intent, chart choice,
                aggregated computations, and a configuration hash — no raw patient data.
            </p>
            <div className="export-receipt-actions">
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={disabled}
                    onClick={() => {
                        void onCopy();
                    }}
                >
                    {loading ? (
                        <>
                            <RingLoader /> Preparing…
                        </>
                    ) : copied ? (
                        "Copied!"
                    ) : (
                        "Copy receipt"
                    )}
                </button>
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={disabled}
                    onClick={onDownloadTxt}
                >
                    {loading ? "Preparing…" : "Download .txt"}
                </button>
                <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={disabled}
                    onClick={onDownloadMd}
                >
                    {loading ? "Preparing…" : "Download .md"}
                </button>
            </div>
            {error !== null ? (
                <p role="alert" className="muted export-receipt-error">
                    {error}
                </p>
            ) : null}
            {receipt !== null ? (
                <p className="muted mono small export-receipt-hash">
                    Config hash: {receipt.hash.slice(0, 12)}… · Generated {receipt.generatedAt}
                </p>
            ) : null}
        </section>
    );
};
