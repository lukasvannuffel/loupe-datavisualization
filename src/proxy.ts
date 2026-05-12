import { type NextRequest, NextResponse } from "next/server";

import { buildSecurityHeaders } from "@/lib/security-headers";
import { updateSession } from "@/utils/supabase/middleware";

const NONCE_REQUEST_HEADER = "x-nonce";
const CSP_HEADER = "Content-Security-Policy";

const isProduction = process.env.NODE_ENV === "production";

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
    const requestHeaders = new Headers(request.headers);
    let responseCsp: string | undefined;

    if (isProduction) {
        const { nonce, csp } = buildSecurityHeaders();

        requestHeaders.set(NONCE_REQUEST_HEADER, nonce);
        requestHeaders.set(CSP_HEADER, csp);
        responseCsp = csp;
    }

    const response = await updateSession(request, requestHeaders);

    if (responseCsp !== undefined) {
        response.headers.set(CSP_HEADER, responseCsp);
    }

    return response;
};

export const config = {
    matcher: [
        // Match all request paths except for:
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico
        // - common image / font extensions
        // - 149e9513-... (Vercel BotID challenge proxy — registered via withBotId)
        "/((?!_next/static|_next/image|favicon.ico|149e9513-01fa-4fb0-aad4-566afd725d1b|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)",
    ],
};
