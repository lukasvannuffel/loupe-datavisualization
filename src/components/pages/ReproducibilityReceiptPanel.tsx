"use client";

import { useCallback, useEffect, useState } from "react";

import { RingLoader } from "@/components/primitives/RingLoader";
import {
    composeReceipt,
    type Receipt as ComposedReceipt,
    type ReceiptInput,
} from "@/lib/receipt/composeReceipt";
import { copyToClipboard } from "@/lib/receipt/copyToClipboard";
import { useToast } from "@/lib/toast/useToast";

type ReproducibilityReceiptPanelProps = {
    readonly input: ReceiptInput | null;
    readonly variant?: "standalone" | "embedded";
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
    variant = "standalone",
}: ReproducibilityReceiptPanelProps): JSX.Element | null => {
    const { toast } = useToast();
    const [receipt, setReceipt] = useState<ComposedReceipt | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        if (input === null) {
            setReceipt(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        void composeReceipt(input)
            .then((next) => {
                if (!cancelled) {
                    setReceipt(next);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setReceipt(null);
                    toast({
                        description: "Try again in a moment.",
                        title: "Receipt could not be generated.",
                        variant: "error",
                    });
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
    }, [input, toast]);

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

        try {
            await copyToClipboard(receipt.markdown);
            setCopied(true);
            toast({
                description: "Paste it into supplementary materials.",
                title: "Receipt copied.",
                variant: "success",
            });
        } catch {
            setCopied(false);
            toast({
                description: "Try downloading the receipt as a file instead.",
                title: "Clipboard copy failed.",
                variant: "error",
            });
        }
    }, [receipt, toast]);

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
    const embedded = variant === "embedded";
    const sectionClass = embedded
        ? "export-receipt export-receipt--embedded export-panel-zone"
        : "export-receipt";
    const headingClass = embedded ? "export-panel-label" : undefined;
    const HeadingTag = embedded ? "h3" : "h4";

    return (
        <section
            className={sectionClass}
            aria-labelledby="reproducibility-receipt-heading"
        >
            <HeadingTag
                id="reproducibility-receipt-heading"
                className={headingClass}
            >
                Reproducibility receipt
            </HeadingTag>
            <p className={embedded ? "export-receipt-desc" : undefined}>
                Paste into supplementary materials. Records analytical intent, chart choice,
                aggregated computations, and a configuration hash — no raw patient data.
            </p>
            <div className={`export-receipt-actions${embedded ? " export-toolbar" : ""}`}>
                <button
                    type="button"
                    className="btn btn--quiet btn--sm"
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
                    className="btn btn--quiet btn--sm"
                    disabled={disabled}
                    onClick={onDownloadTxt}
                >
                    {loading ? "Preparing…" : "Download .txt"}
                </button>
                <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    disabled={disabled}
                    onClick={onDownloadMd}
                >
                    {loading ? "Preparing…" : "Download .md"}
                </button>
            </div>
            {receipt !== null ? (
                <p className="muted mono small export-receipt-hash">
                    Config hash: {receipt.hash.slice(0, 12)}… · Generated {receipt.generatedAt}
                </p>
            ) : null}
        </section>
    );
};
