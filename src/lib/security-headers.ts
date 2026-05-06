import { SUPABASE_URL } from "@/lib/env";

const isProduction = process.env.NODE_ENV === "production";

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

const buildCspHeader = (nonce: string): string => {
    const directives = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? "" : " 'unsafe-eval'"}`,
        `style-src 'self' 'nonce-${nonce}'`,
        `img-src 'self' blob: data: ${SUPABASE_HTTPS}`,
        "font-src 'self' data:",
        `connect-src 'self' ${SUPABASE_HTTPS} ${SUPABASE_WSS}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ];

    return directives.join("; ");
};

export const buildSecurityHeaders = (): { nonce: string; csp: string } => {
    const nonce = generateNonce();

    return { nonce, csp: buildCspHeader(nonce) };
};
