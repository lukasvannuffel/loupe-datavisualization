"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
    readonly error: Error & { digest?: string };
    readonly reset: () => void;
};

const ErrorPage = ({ error, reset }: ErrorPageProps): JSX.Element => {
    useEffect(() => {
        console.error("[route-error]", error);
    }, [error]);

    return (
        <div className="container page-enter" style={{ paddingTop: 48, paddingBottom: 48 }}>
            <h1 className="upload-title">Something went wrong</h1>
            <p className="muted" style={{ maxWidth: "36rem", marginTop: 12 }}>
                Loupe hit an unexpected snag. Your data is still safe in the browser — try again,
                or head back to your dashboard.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn--primary btn--sm" onClick={reset}>
                    Try again
                </button>
                <Link href="/dashboard" className="btn btn--secondary btn--sm">
                    Go to dashboard
                </Link>
            </div>
        </div>
    );
};

export default ErrorPage;
