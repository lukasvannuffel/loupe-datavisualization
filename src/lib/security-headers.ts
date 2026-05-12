import { SUPABASE_URL } from "@/lib/env";

const SUPABASE_HOST = ((): string => {
    return new URL(SUPABASE_URL).host;
})();
const SUPABASE_HTTPS = `https://${SUPABASE_HOST}`;
const SUPABASE_WSS = `wss://${SUPABASE_HOST}`;

const generateNonce = (): string => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    return btoa(String.fromCharCode(...bytes));
};

/**
 * Strict CSP for production. Not applied during local `next dev` so the Next.js
 * dev indicator / overlay can use inline styles (they do not receive the HTML nonce).
 *
 * `style-src` intentionally omits the HTML nonce: React `style={{}}`, Emotion-style
 * libraries, and Next Dev Tools apply inline **style attributes**, which cannot carry
 * a CSP nonce. Browsers therefore block them under `style-src … 'nonce-*'` only.
 * Scripts remain locked down via `nonce-*` + `strict-dynamic`.
 */
const buildCspHeader = (nonce: string): string => {
    const directives = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' blob: data: ${SUPABASE_HTTPS}`,
        "font-src 'self' data:",
        `connect-src 'self' ${SUPABASE_HTTPS} ${SUPABASE_WSS}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ];

    return directives.join("; ");
};

export const buildSecurityHeaders = (): { nonce: string; csp: string } => {
    const nonce = generateNonce();

    return { nonce, csp: buildCspHeader(nonce) };
};
