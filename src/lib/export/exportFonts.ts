/** Self-hosted latin WOFF2 — avoids CSP connect-src blocks and third-party leaks in prod. */
export const EXPORT_FONTS = [
    {
        url: "/fonts/source-serif-4-latin.woff2",
        family: "Source Serif 4",
        style: "normal",
        weight: "400",
    },
    {
        url: "/fonts/inter-latin.woff2",
        family: "Inter",
        style: "normal",
        weight: "400",
    },
] as const;
