"use client";

import Link from "next/link";
import { useEffect } from "react";

type GlobalErrorPageProps = {
    readonly error: Error & { digest?: string };
    readonly reset: () => void;
};

const GlobalErrorPage = ({ error, reset }: GlobalErrorPageProps): JSX.Element => {
    useEffect(() => {
        console.error("[global-error]", error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FAFAF7" }}>
                <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
                    <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong</h1>
                    <p style={{ color: "#6B6B66", lineHeight: 1.5, marginTop: 12 }}>
                        Loupe hit an unexpected snag. Try again, or return to your dashboard.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
                        <button
                            type="button"
                            onClick={reset}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 4,
                                border: "none",
                                background: "#0B2A4A",
                                color: "#FAFAF7",
                                cursor: "pointer",
                            }}
                        >
                            Try again
                        </button>
                        <Link
                            href="/dashboard"
                            style={{
                                padding: "8px 16px",
                                borderRadius: 4,
                                border: "1px solid #E6E3DA",
                                color: "#0E0E0E",
                                textDecoration: "none",
                            }}
                        >
                            Go to dashboard
                        </Link>
                    </div>
                </main>
            </body>
        </html>
    );
};

export default GlobalErrorPage;
