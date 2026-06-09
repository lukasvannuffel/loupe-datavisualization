"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Eyebrow } from "@/components/primitives/Eyebrow";

type ExportErrorProps = {
    readonly error: Error & { digest?: string };
    readonly reset: () => void;
};

const ExportError = ({ error, reset }: ExportErrorProps): JSX.Element => {
    const router = useRouter();

    useEffect(() => {
        console.error("[export] boundary caught:", error.message);
    }, [error]);

    return (
        <div className="container page-enter" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <Eyebrow>Export error</Eyebrow>
            <h1 className="upload-title">Something went wrong</h1>
            <p className="muted" style={{ maxWidth: "36rem", marginTop: 12 }}>
                The chart could not be rendered. Try again or go back to adjust your recommendation.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn--primary btn--sm" onClick={reset}>
                    Try again
                </button>
                {/* NOTE: may redirect to /upload/map if wizard state is empty — expected RecommendGate behaviour. */}
                <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                        router.push("/recommend");
                    }}
                >
                    Back to recommendation
                </button>
            </div>
        </div>
    );
};

export default ExportError;
